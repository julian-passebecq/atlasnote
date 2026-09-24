import {COMPACTION_BLOCKED,COMPACTION_BLOCK_REASON} from '../durability/release-state.js';
import {planCompaction} from '../durability/archive.mjs';
import {clearArchiveAttachments,setHistoryComplete} from '../durability/registry.js';
import {preflightStorage,workspaceImportBytes} from '../durability/storage-health.mjs';
import {validateHubOverlays,validateHubPersonal} from '../content-hub/validation.mjs';
import {migratePersonal,activeSession} from '../core/workspace-slots.js';
import {validatePersonal} from './personal-validation.mjs';
import {repairAbsentPersonalOptionals} from '../core/personal-state.js';
import type {Workspace,Personal,Overlays,Pack,Asset} from '../core/model.js';
import {blankWorkspace,compose} from '../core/workspace.js';
import {stable,sha256} from '../core/validation.mjs';
import {emptyHistory} from '../history/model.js';
import type {HistoryData,RevisionContext,AgentReviewRecord} from '../history/model.js';
import {prepareWorkspaceHistory,advanceHistory,assertProjection,prepareEmergencySnapshot,changedResources} from '../history/engine.js';
import {captureResources} from '../history/adapters.js';
import {validateHistory} from '../history/validation.mjs';
import {mergePersonal} from './personal-merge.mjs';
const DB_NAME='knowledge-atlas';export const DB_VERSION=3;
const STORES=['imports','overlays','personal','assets','history'];
let connection:Promise<IDBDatabase>|null=null;
let builtSource:any={packs:[],groups:[]};
export function openDatabase():Promise<IDBDatabase>{
 if(connection)return connection;
 connection=new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);let rejected=false;
  const fail=(error:unknown)=>{rejected=true;reject(error);};
  req.onupgradeneeded=()=>{const db=req.result;for(const name of ['imports','overlays','personal','assets'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name);
   if(!db.objectStoreNames.contains('history')){const history=req.transaction!.db.createObjectStore('history');history.createIndex('kind','kind',{unique:false});history.createIndex('resourceKey','resourceKey',{unique:false});}};
  // A blocked open can succeed later after the caller has already seen an
  // error. Close that orphan immediately instead of leaking an owner connection.
  req.onsuccess=()=>{if(rejected){req.result.close();return;}req.result.onversionchange=()=>{req.result.close();connection=null;};resolve(req.result);};req.onerror=()=>fail(req.error);req.onblocked=()=>fail(Error('Database upgrade is blocked by another Atlas tab. Close the other tab, then reload.'));
 }).catch(e=>{connection=null;throw e;});return connection;
}
function request<T>(req:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function complete(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('Storage transaction aborted'));tx.onerror=()=>reject(tx.error??Error('Storage error'));});}
function historyFromRecords(records:any[]):HistoryData {return {schemaVersion:1,meta:records.find(r=>r.kind==='meta')??emptyHistory().meta,heads:records.filter(r=>r.kind==='head'),revisions:records.filter(r=>r.kind==='revision'),reviews:records.filter(r=>r.kind==='review'),...(records.some(r=>r.kind==='archive')?{archives:records.filter(r=>r.kind==='archive')}:{})};}
export async function loadWorkspace():Promise<Workspace>{
 const db=await openDatabase(),tx=db.transaction(STORES,'readonly');const [imports,overlays,personal,assets,records]=await Promise.all([request(tx.objectStore('imports').getAll()),request(tx.objectStore('overlays').get('active')),request(tx.objectStore('personal').get('active')),request(tx.objectStore('assets').getAll()),request(tx.objectStore('history').getAll())]);
 const empty=blankWorkspace();if(overlays&&overlays.schemaVersion!==2||personal&&![2,3].includes(personal.schemaVersion))throw Error('Unknown saved-state version. Data has not been reset. Export a raw recovery backup from Settings.');
 return {...empty,imports,overlays:overlays??empty.overlays,personal:preparePersonal(personal??empty.personal),assets,history:historyFromRecords(records)};
}
/** V3 staged boot, phase 1: what the first render needs. Imports, overlays and
 * personal state, plus history meta/heads/reviews/archive descriptors through
 * the existing `kind` index. Asset bytes and revision snapshots are NOT read. */
export async function loadShell():Promise<Workspace>{
 const db=await openDatabase(),tx=db.transaction(['imports','overlays','personal','history'],'readonly'),kind=tx.objectStore('history').index('kind');
 const [imports,overlays,personal,meta,heads,reviews,archives]=await Promise.all([request(tx.objectStore('imports').getAll()),request(tx.objectStore('overlays').get('active')),request(tx.objectStore('personal').get('active')),request(kind.getAll('meta')),request(kind.getAll('head')),request(kind.getAll('review')),request(kind.getAll('archive'))]);
 const empty=blankWorkspace();if(overlays&&overlays.schemaVersion!==2||personal&&![2,3].includes(personal.schemaVersion))throw Error('Unknown saved-state version. Data has not been reset. Export a raw recovery backup from Settings.');
 return {...empty,imports,overlays:overlays??empty.overlays,personal:preparePersonal(personal??empty.personal),assets:[],history:historyFromRecords([...meta,...heads,...reviews,...archives])};
}
/** Phase 2: the complete durable asset and history stores, in one transaction so
 * heads and revisions are mutually consistent. Authored commands wait for this. */
async function loadHeavy():Promise<{assets:Asset[];history:HistoryData}>{
 const db=await openDatabase(),tx=db.transaction(['assets','history'],'readonly');
 const [assets,records]=await Promise.all([request(tx.objectStore('assets').getAll()),request(tx.objectStore('history').getAll())]);
 return {assets,history:historyFromRecords(records)};
}
/** The single durable authored-content boundary. Hashing/validation happens BEFORE
 * opening the transaction. A compare-and-swap epoch rejects concurrent-tab writes.
 * Current projections, immutable revisions, heads, review audit and selected
 * personal changes commit together, or the browser aborts all of them. */
async function commitProjection(ws:Workspace,previous:HistoryData,writes:string[],replace=false,expectedPersonal?:Personal){
 const h=ws.history!;const oldIds=new Set(previous.revisions.map(r=>r.revisionId));
 const db=await openDatabase(),tx=db.transaction(STORES,'readwrite'),done=complete(tx);
 try{
  const [meta,persistedPersonal]=await Promise.all([request(tx.objectStore('history').get('meta')),expectedPersonal?request(tx.objectStore('personal').get('active')):Promise.resolve(undefined)]);
  if(!replace&&(meta?.epoch??0)!==previous.meta.epoch)throw Error('Another tab changed resource history. Reload before applying this edit. Nothing was overwritten.');
  if(expectedPersonal&&stable(preparePersonal(persistedPersonal??blankWorkspace().personal))!==stable(expectedPersonal))throw Error('Personal/workspace state changed in another tab; review again.');
  if(replace)for(const name of STORES)tx.objectStore(name).clear();
  if(replace||writes.includes('imports'))for(const p of ws.imports)tx.objectStore('imports').put(p,p.manifest.id);
  if(replace||writes.includes('assets'))for(const a of ws.assets)tx.objectStore('assets').put(a,a.key);
  if(replace||writes.includes('overlays'))tx.objectStore('overlays').put(ws.overlays,'active');
  if(replace||writes.includes('personal'))tx.objectStore('personal').put(ws.personal,'active');
  const history=tx.objectStore('history');
  for(const r of h.revisions)if(replace||!oldIds.has(r.revisionId))history.add(r,'revision:'+r.revisionId);
  for(const archive of h.archives??[])if(replace||!previous.archives?.some(a=>a.archiveId===archive.archiveId))history.add(archive,'archive:'+archive.archiveId);
  for(const head of h.heads)history.put(head,'head:'+head.resourceKey);
  for(const review of h.reviews)history.put(review,'review:'+review.id);
  history.put(h.meta,'meta');
  await done;
 }catch(e){try{tx.abort();}catch{}await done.catch(()=>{});throw e;}
}
export async function writePersonal(personal:Personal){const canonical=preparePersonal(personal),db=await openDatabase(),tx=db.transaction('personal','readwrite'),done=complete(tx);tx.objectStore('personal').put(canonical,'active');await done;}
/** V3 cross-tab guard for ordinary personal writes. Inside ONE readwrite
 * transaction, compare the persisted record with what this tab last persisted.
 * Unchanged: write ours. Changed by another tab: 3-way merge so neither tab's
 * independent changes are lost, validate, then write the merge. Returns what
 * was persisted. A per-tab promise queue alone never serialized two tabs. */
export async function writePersonalChecked(personal:Personal,base:Personal|undefined,preferTheirs=false):Promise<{persisted:Personal;merged:boolean;conflicts:string[]}>{
 const canonical=preparePersonal(personal),db=await openDatabase(),tx=db.transaction('personal','readwrite'),done=complete(tx),store=tx.objectStore('personal');
 try{
  const current=await request(store.get('active'));
  if(!current||!base||stable(current)===stable(base)){store.put(canonical,'active');await done;return {persisted:canonical,merged:false,conflicts:[]};}
  const {personal:merged,conflicts}=mergePersonal(base,canonical,current,{preferTheirs});
  const next=preparePersonal(merged);validatePersonal(next);validateHubPersonal(next);
  store.put(next,'active');await done;return {persisted:next,merged:true,conflicts};
 }catch(e){try{tx.abort();}catch{}await done.catch(()=>{});throw e;}
}
/** Reading-position checkpoints are coalesced: at most one durable write per
 * interval, plus a trailing write. The in-memory position updates immediately.
 * Explicit navigation, workspace switches, saved states, backups and every other
 * personal() write flush it. Documented loss window on abrupt termination. */
export const CHECKPOINT_INTERVAL_MS=500;
async function readPersistedPersonal():Promise<Personal|undefined>{const db=await openDatabase(),tx=db.transaction('personal','readonly'),value=await request(tx.objectStore('personal').get('active'));return value?preparePersonal(value):undefined;}
async function writeContent(patch:Partial<Workspace>,writes:string[],context:RevisionContext={source:'manual'}){const before=await loadWorkspace(),next=await prepareWorkspaceHistory(builtSource,{...before,...patch},context);await commitProjection(next,before.history!,writes);return next;}
export async function writeOverlays(overlays:Overlays){return writeContent({overlays},['overlays']);}
export async function writeShared(personal:Personal,overlays:Overlays){return writeContent({personal:preparePersonal(personal),overlays},['personal','overlays']);}
export async function commitImport(imports:Pack[],assets:Asset[],overlays:Overlays){const old=await loadWorkspace();return writeContent({imports:[...new Map([...old.imports,...imports].map(p=>[p.manifest.id,p])).values()],assets:[...new Map([...old.assets,...assets].map(a=>[a.key,a])).values()],overlays},['imports','assets','overlays'],{source:'import'});}
export async function restoreWorkspace(ws:Workspace,resolveAsset?:(key:string)=>Promise<Asset|undefined>){
 const previous=await loadWorkspace();let next={...ws,personal:preparePersonal(ws.personal)};
 if(next.history){
  const validationAssets=[...next.assets],have=new Set(validationAssets.map(a=>a.key)),needed=new Set<string>();
  for(const revision of next.history.revisions){for(const ref of Object.values(revision.snapshot.assetRefs??{}))needed.add(ref.key);if(revision.snapshot.document?.assetKey)needed.add(revision.snapshot.document.assetKey);}
  if(resolveAsset)for(const key of needed)if(!have.has(key)){const asset=await resolveAsset(key);if(asset){validationAssets.push(asset);have.add(key);}}
  await validateHistory(next.history,validationAssets,true);await assertProjection(compose(builtSource,next),next);
 }else next=await prepareWorkspaceHistory(builtSource,next,{source:'migration',summary:'Baseline from legacy backup'});
 await commitProjection(next,previous.history!,STORES,true);return next;
}
export async function rawRecovery(){const db=await openDatabase(),tx=db.transaction(STORES,'readonly');return Object.fromEntries(await Promise.all(STORES.map(async n=>[n,await request(tx.objectStore(n).getAll())])));}
export class WorkspaceStore{
 state:Workspace={...blankWorkspace(),personal:preparePersonal(blankWorkspace().personal)};error='';saving=0;private listeners=new Set<()=>void>();private queue=Promise.resolve();private reviewPreparing=false;
 /** What this tab last read from or wrote to the durable personal record. */
 private persistedPersonal:Personal|undefined;
 /** V3 staged boot. `ready` is true for every caller that loads the complete
  * workspace (setLoaded, tests, recovery). main.tsx opts into staging: until the
  * full assets/history are hydrated and reconciled, authored/history/backup
  * commands WAIT for the complete state; they never run on the shell read. */
 hydrated=true;private ready=true;private readyWaiter:Promise<void>=Promise.resolve();private settleReady:{resolve:()=>void;reject:(e:unknown)=>void}|undefined;
 configure(built:any){builtSource=built;}
 beginStagedBoot(){this.ready=false;this.hydrated=false;setHistoryComplete(false);this.readyWaiter=new Promise<void>((resolve,reject)=>{this.settleReady={resolve,reject};});this.readyWaiter.catch(()=>{});}
 setShell(ws:Workspace){this.state={...ws,personal:preparePersonal(ws.personal)};this.persistedPersonal=this.state.personal;this.emit();}
 async hydrate(){const heavy=await loadHeavy();this.state={...this.state,assets:heavy.assets,history:heavy.history,generation:this.state.generation+1};this.hydrated=true;setHistoryComplete(true);this.emit();}
 markReady(){this.ready=true;this.settleReady?.resolve();this.emit();}
 markFailed(e:unknown){this.settleReady?.reject(e);}
 /** DATA-03: the durable record could not be read (unknown version, corrupt or
  * blocked database). The UI shows a blank workspace, so NO ordinary write may
  * reach IndexedDB: that would replace the user's real data with the blank
  * state. Only a verified restore (which reads and validates its own input) can
  * clear this. Raw recovery export stays available. */
 private shellFailed=false;
 markShellFailed(e:unknown){this.shellFailed=true;this.markFailed(e);}
 get writesBlocked(){return this.shellFailed;}
 private assertWritable(){if(this.shellFailed)throw Error('Your saved workspace could not be read, so nothing will be written over it. Export a raw recovery backup or restore a verified backup from Settings.');}
 get isReady(){return this.ready;}
 whenReady(){return this.ready?Promise.resolve():this.readyWaiter;}
 private async gate(tolerateFailure=false){if(this.ready)return;try{await this.readyWaiter;}catch(e){if(!tolerateFailure)throw Error('The local library did not finish loading: '+((e as Error)?.message??e)+'. Nothing was changed.');}}private checkpointTimer:ReturnType<typeof setTimeout>|undefined;private checkpointDirty=false;conflictNotice='';
 /** V3 cross-tab invalidation. A committed write is announced on a BroadcastChannel.
  * Idle peers adopt another tab's personal changes through the same 3-way merge,
  * never replacing the session of the workspace they are displaying. A content or
  * history commit elsewhere only raises a reload notice: this tab's projection is
  * stale and its authored writes are already rejected by the history epoch check. */
 staleNotice='';private channel:BroadcastChannel|null=null;private readonly tabId=Math.random().toString(36).slice(2);
 connectTabs(){if(this.channel||typeof BroadcastChannel==='undefined')return;this.channel=new BroadcastChannel('knowledge-atlas-sync');this.channel.onmessage=e=>{void this.onPeer(e.data).catch(()=>{});};}
 dismissNotices(){this.staleNotice='';this.conflictNotice='';this.state={...this.state};this.emit();}
 private announce(kind:'personal'|'content'){try{this.channel?.postMessage({kind,tab:this.tabId,at:Date.now()});}catch{}}
 private async onPeer(message:any){
  if(!message||message.tab===this.tabId||!['personal','content'].includes(message.kind))return;
  if(message.kind==='content'){this.staleNotice='Another tab changed your library or its version history. Reload to see those changes; nothing in this tab was lost.';this.state={...this.state};this.emit();return;}
  if(!this.ready||this.saving>0||this.checkpointDirty||this.reviewPreparing)return; // a local write will CAS-merge instead
  const persisted=await readPersistedPersonal();if(!persisted||this.saving>0||this.checkpointDirty)return;
  const ours=this.state.personal,base=this.persistedPersonal??ours;if(stable(persisted)===stable(base))return;
  const {personal:merged}=mergePersonal(base,ours,persisted),slot=ours.activeWorkspaceSlot??1,shown=structuredClone(activeSession(ours,slot));
  // Keep this tab's displayed workspace exactly as the user left it.
  if(slot===1)merged.session=shown;else merged.workspaceSlots={...(merged.workspaceSlots??{}),[slot]:shown};merged.activeWorkspaceSlot=slot;
  const next=preparePersonal(merged);validatePersonal(next);this.persistedPersonal=persisted;
  if(stable(next)!==stable(ours)){this.state={...this.state,personal:next,generation:this.state.generation+1};this.emit();}
 }
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};getSnapshot=()=>this.state;
 emit(){this.listeners.forEach(f=>f());}
 setLoaded(ws:Workspace){this.state={...ws,personal:preparePersonal(ws.personal)};this.persistedPersonal=this.state.personal;this.emit();}
 /** Persist the latest personal state through the cross-tab guard. Another tab's
  * independent changes are merged into memory too (this tab's slot navigation kept). */
 private async persistPersonal(checkpoint=false){this.assertWritable();const ours=this.state.personal;const result=await writePersonalChecked(ours,this.persistedPersonal,checkpoint);this.persistedPersonal=result.persisted;this.announce('personal');
  if(result.merged){if(result.conflicts.length)this.conflictNotice='Another tab changed the same workspace data; '+(checkpoint?'its version was kept for: ':'this tab\'s version was kept for: ')+result.conflicts.slice(0,5).join(', ');const latest=this.state.personal,merged=latest===ours?result.persisted:mergePersonal(ours,latest,result.persisted).personal;this.state={...this.state,personal:preparePersonal({...merged,activeWorkspaceSlot:latest.activeWorkspaceSlot} as Personal),generation:this.state.generation+1};this.emit();}}
 private flushCheckpoint(){if(this.checkpointTimer!==undefined){clearTimeout(this.checkpointTimer);this.checkpointTimer=undefined;}if(!this.checkpointDirty)return;this.checkpointDirty=false;void this.enqueue(()=>this.persistPersonal(true)).catch(()=>{});}
 checkpoint(fn:(p:Personal)=>void){if(this.reviewPreparing)return this.personal(fn);const p=structuredClone(this.state.personal);fn(p);validateHubPersonal(p);this.state={...this.state,personal:repairAbsentPersonalOptionals(p),generation:this.state.generation+1};this.emit();this.checkpointDirty=true;this.checkpointTimer??=setTimeout(()=>this.flushCheckpoint(),CHECKPOINT_INTERVAL_MS);return Promise.resolve();}
 flushPending(){this.flushCheckpoint();}
 fail=(e:any)=>{this.error=`Changes could not be saved: ${e?.message??e}. Keep this tab open. Free browser storage, then retry, or download an emergency backup.`;this.state={...this.state};this.emit();};
 private enqueue(fn:()=>Promise<void>,reportFailure=true){this.saving++;this.state={...this.state};this.emit();const result=this.queue.then(fn);this.queue=result.catch(e=>{if(reportFailure)this.fail(e);}).finally(()=>{this.saving--;this.state={...this.state};this.emit();});return result;}
 /** Baselines are resumable in bounded transactions. An interrupted batch is all
  * or nothing; completed batches are recognized by hash and are not duplicated. */
 async initializeHistory(built:any){builtSource=built;await this.flush();this.saving++;this.emit();try{let history=this.state.history??emptyHistory();await validateHistory(history);
  // V3: only resources whose fingerprint changed go through advanceHistory, so an
  // unchanged library no longer clones/serializes the whole history per 50 items.
  const resources=await changedResources(history,captureResources(compose(built,this.state),this.state));
  for(let at=0;at<resources.length;at+=50){const next=await advanceHistory(history,resources.slice(at,at+50),{source:history.meta.initialized?'system':'migration',summary:history.meta.initialized?'Reviewed application source update':'V2.1.0 production baseline',sourceDetail:'Source b50c27a987fa65eee1c51d36225908621e322da7'},false);if(next.meta.epoch!==history.meta.epoch){await commitProjection({...this.state,history:next},history,[]);history=next;this.state={...this.state,history};this.announce('content');}}
  if(!history.meta.initialized){const next=await advanceHistory(history,[],{source:'migration'},true);await commitProjection({...this.state,history:next},history,[]);history=next;}this.state={...this.state,history};this.emit();
 }finally{this.saving--;this.emit();}
 }
 personal(fn:(p:Personal)=>void){if(this.reviewPreparing)return this.enqueue(async()=>{const p=structuredClone(this.state.personal);fn(p);const canonical=preparePersonal(p);this.state={...this.state,personal:canonical,generation:this.state.generation+1};await this.persistPersonal();this.emit();});const p=structuredClone(this.state.personal);fn(p);validateHubPersonal(p);const canonical=repairAbsentPersonalOptionals(p);this.state={...this.state,personal:canonical,generation:this.state.generation+1};this.emit();
  // Any explicit write persists the latest state, which includes a pending checkpoint.
  this.checkpointDirty=false;if(this.checkpointTimer!==undefined){clearTimeout(this.checkpointTimer);this.checkpointTimer=undefined;}
  return this.enqueue(()=>this.persistPersonal());}
 private content(next:Workspace,writes:string[],context:RevisionContext){this.state={...next,generation:this.state.generation+1};this.emit();return this.enqueue(async()=>{const previous=this.state.history??emptyHistory(),ready=await prepareWorkspaceHistory(builtSource,{...next,history:previous},context);await commitProjection(ready,previous,writes);if(writes.includes('personal'))this.persistedPersonal=ready.personal;this.state={...this.state,history:ready.history};this.announce('content');this.emit();});}
 overlays(fn:(o:Overlays)=>void):Promise<void>{if(!this.ready)return this.gate().then(()=>this.overlays(fn));if(this.reviewPreparing)return Promise.reject(Error('A reviewed change is being committed. Reopen this edit after it finishes.'));const o=structuredClone(this.state.overlays);fn(o);validateHubOverlays(o);return this.content({...this.state,overlays:o},['overlays'],{source:'manual'});}
 shared(fn:(p:Personal,o:Overlays)=>void):Promise<void>{if(!this.ready)return this.gate().then(()=>this.shared(fn));if(this.reviewPreparing)return Promise.reject(Error('A reviewed change is being committed. Reopen this edit after it finishes.'));const p=structuredClone(this.state.personal),o=structuredClone(this.state.overlays);fn(p,o);validateHubOverlays(o);return this.content({...this.state,personal:preparePersonal(p),overlays:o},['personal','overlays'],{source:'manual'});}
 async importPacks(imports:Pack[],assets:Asset[],overlays:Overlays){await this.gate();await this.flush();if(this.error)throw Error('Resolve the storage warning before importing.');await preflightStorage(workspaceImportBytes(imports,assets,overlays));const byPack=new Map(this.state.imports.map(p=>[p.manifest.id,p]));imports.forEach(p=>byPack.set(p.manifest.id,p));const byAsset=new Map(this.state.assets.map(a=>[a.key,a]));assets.forEach(a=>{const old=byAsset.get(a.key);if(old&&(old.sha256!==a.sha256||old.mediaType!==a.mediaType))throw Error('A historical asset key cannot be overwritten; import a new asset/pack version.');byAsset.set(a.key,a);});await this.content({...this.state,imports:[...byPack.values()],assets:[...byAsset.values()],overlays},['imports','assets','overlays'],{source:'import'});}
 async restore(ws:Workspace,resolveAsset?:(key:string)=>Promise<Asset|undefined>){await this.gate(true);await this.flush();this.saving++;this.reviewPreparing=true;this.state={...this.state};this.emit();try{await preflightStorage(workspaceImportBytes(ws.imports,ws.assets,ws.overlays)+new TextEncoder().encode(JSON.stringify(ws.history??{})).length);const restored=await restoreWorkspace(ws,resolveAsset);clearArchiveAttachments();this.shellFailed=false;this.persistedPersonal=restored.personal;this.announce('content');this.state={...restored,generation:this.state.generation+1};this.error='';this.emit();}finally{this.reviewPreparing=false;this.saving--;this.state={...this.state};this.emit();}}
 async addAsset(asset:Asset){await this.gate();await this.flush();return this.enqueue(async()=>{await preflightStorage(asset.bytes.length);if(await sha256(asset.bytes)!==asset.sha256)throw Error('Attachment SHA-256 mismatch');const existing=this.state.assets.find(a=>a.key===asset.key);if(existing&&existing.sha256!==asset.sha256)throw Error('A content-addressed asset cannot be overwritten');const db=await openDatabase(),tx=db.transaction('assets','readwrite'),done=complete(tx);tx.objectStore('assets').put(asset,asset.key);await done;this.announce('content');this.state={...this.state,assets:[...this.state.assets.filter(a=>a.key!==asset.key),asset]};this.emit();});}
 /** Reviewed actions run against the live state inside the existing write queue.
  * Nothing is exposed on window. The agent facade is the only public orchestrator. */
 async reviewedMutation(fn:(ws:Workspace)=>void,context:RevisionContext){await this.gate();await this.flush();if(this.error)throw Error('Resolve the storage warning before accepting or staging a proposal.');return this.enqueue(async()=>{this.reviewPreparing=true;try{const before=this.state,previous=before.history??emptyHistory(),next=structuredClone(before);fn(next);next.personal=preparePersonal(next.personal);validateHubOverlays(next.overlays);const ready=await prepareWorkspaceHistory(builtSource,next,context);
   if(stable(ready.history!.reviews)!==stable(previous.reviews)&&ready.history!.meta.epoch===previous.meta.epoch)ready.history!.meta.epoch++;
   // Link accepted audit rows to revisions created by this exact batch.
   if(context.changeSetId){const review=ready.history!.reviews.find(r=>r.id===context.changeSetId);if(review?.status==='accepted')review.revisionIds=ready.history!.revisions.filter(r=>r.changeSetId===context.changeSetId).map(r=>r.revisionId);}
   const addedAssets=ready.assets.filter(a=>!before.assets.some(b=>b.key===a.key));
   for(const old of before.assets){const kept=ready.assets.find(a=>a.key===old.key);if(!kept||stable(kept)!==stable(old))throw Error('Reviewed actions cannot remove or replace existing immutable assets.');}
   for(const asset of addedAssets)if(await sha256(asset.bytes)!==asset.sha256)throw Error('Restored historical asset hash mismatch');
   if(addedAssets.length)await preflightStorage(addedAssets.reduce((n,a)=>n+a.bytes.length,0));
   await validateHistory(ready.history!);try{await commitProjection(ready,previous,['overlays','personal',...(addedAssets.length?['assets']:[])],false,this.persistedPersonal??before.personal);}catch(e){this.fail(e);throw e;}this.persistedPersonal=ready.personal;this.announce('content');this.state={...ready,generation:this.state.generation+1};this.emit();}finally{this.reviewPreparing=false;}
  },false);}
 async flush(){this.flushCheckpoint();let pending;do{pending=this.queue;await pending;}while(pending!==this.queue);}
 async backupSnapshot(){await this.gate();await this.flush();return this.error&&this.state.history?prepareEmergencySnapshot(builtSource,this.state):structuredClone(this.state);}
 async retry(){this.assertWritable();await this.gate(true);await this.flush();return this.enqueue(async()=>{const previous=await loadWorkspace();if((previous.history?.meta.epoch??0)!==(this.state.history?.meta.epoch??0))throw Error('Another tab advanced history. Export your unsaved recovery copy, then reload.');const next=await prepareWorkspaceHistory(builtSource,this.state,{source:'manual',summary:'Retry unsaved changes'});await commitProjection(next,previous.history!,['imports','assets','overlays','personal']);this.persistedPersonal=next.personal;this.announce('content');this.state={...next};this.error='';this.emit();});}
 get unsafeClose(){return this.saving>0||!!this.error;}
 /** Destructive execution remains fail-closed until the browser fault matrix passes.
  * The implementation is present behind a compile-time release boundary so QA can
  * qualify the exact transaction on a disposable candidate without schema changes. */
 async compactArchive(selection:any,resolveAsset:(key:string)=>Promise<Asset|undefined>){
  if(COMPACTION_BLOCKED)throw Error(COMPACTION_BLOCK_REASON);
  await this.gate();await this.flush();if(this.error)throw Error('Resolve the storage warning before compacting history.');
  return this.enqueue(async()=>{this.reviewPreparing=true;try{
   if(!selection?.archive||!selection?.raw||typeof selection.previewHash!=='string')throw Error('A verified saved-file selection is required.');
   const persisted=workspaceFromStoredRecords(selection.raw);
   const plan=await planCompaction(persisted,selection.archive,builtSource.packs,captureResources(compose(builtSource,persisted),persisted),resolveAsset);
   if(plan.previewHash!==selection.previewHash)throw Error('Compaction preview changed. Prepare, save and re-select a new archive.');
   await commitPreparedCompaction(selection.raw,plan.workspace.history!,selection.archive.descriptor,plan.preview);
   this.persistedPersonal=plan.workspace.personal;this.announce('content');this.state={...plan.workspace,generation:this.state.generation+1};this.error='';this.emit();
  }finally{this.reviewPreparing=false;}},false);
 }
}

function preparePersonal(p:Personal):Personal{const repaired=repairAbsentPersonalOptionals(p);validatePersonal(repaired);return migratePersonal(repaired);}
export const store=new WorkspaceStore();

// Read all five stores from one consistent transaction.
export type RawState=Record<string,{keys:IDBValidKey[];values:any[]}>;
async function readRawState(tx:IDBTransaction):Promise<RawState>{return Object.fromEntries(await Promise.all(STORES.map(async name=>{const store=tx.objectStore(name),[keys,values]=await Promise.all([request(store.getAllKeys()),request(store.getAll())]);return [name,{keys,values}];})));}
export async function captureRawDatabaseState():Promise<RawState>{const db=await openDatabase(),tx=db.transaction(STORES,'readonly'),done=complete(tx);const raw=await readRawState(tx);await done;return raw;}
function exactStoredEqual(a:any,b:any):boolean{
 if(Object.is(a,b))return true;
 if(a instanceof ArrayBuffer&&b instanceof ArrayBuffer){a=new Uint8Array(a);b=new Uint8Array(b);}
 if(ArrayBuffer.isView(a)&&ArrayBuffer.isView(b)){const aa=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),bb=new Uint8Array(b.buffer,b.byteOffset,b.byteLength);if(aa.length!==bb.length)return false;for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])return false;return true;}
 if(a instanceof Date||b instanceof Date)return a instanceof Date&&b instanceof Date&&a.getTime()===b.getTime();
 if(typeof Blob!=='undefined'&&(a instanceof Blob||b instanceof Blob))return false; // Cannot byte-compare synchronously inside the live transaction.
 if(a instanceof Map||b instanceof Map){if(!(a instanceof Map&&b instanceof Map)||a.size!==b.size)return false;const aa=[...a.entries()],bb=[...b.entries()];return aa.every(([k,v],i)=>exactStoredEqual(k,bb[i]?.[0])&&exactStoredEqual(v,bb[i]?.[1]));}
 if(a instanceof Set||b instanceof Set){if(!(a instanceof Set&&b instanceof Set)||a.size!==b.size)return false;const aa=[...a.values()],bb=[...b.values()];return aa.every((v,i)=>exactStoredEqual(v,bb[i]));}
 if(a instanceof RegExp||b instanceof RegExp)return a instanceof RegExp&&b instanceof RegExp&&a.source===b.source&&a.flags===b.flags;
 if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&Object.keys(a).length===Object.keys(b).length&&a.every((v,i)=>exactStoredEqual(v,b[i]));
 if(a&&b&&typeof a==='object'&&typeof b==='object'){
  const ap=Object.getPrototypeOf(a),bp=Object.getPrototypeOf(b);if(ap!==bp&&!(ap===null&&bp===null))return false;
  const ak=Object.keys(a).sort(),bk=Object.keys(b).sort();return ak.length===bk.length&&ak.every((k,i)=>k===bk[i]&&exactStoredEqual(a[k],b[k]));
 }
 return false;
}
function rawStateEqual(a:RawState,b:RawState){return STORES.every(name=>exactStoredEqual(a[name]?.keys,b[name]?.keys)&&exactStoredEqual(a[name]?.values,b[name]?.values));}
/** One all-store readwrite transaction. All expensive hashing/ZIP validation/planning
 * happens before this call. The final read callback compares exact persisted bytes
 * synchronously and queues every destructive request before yielding back to the event loop. */
async function commitPreparedCompaction(expected:RawState,nextHistory:HistoryData,descriptor:any,preview:any){
 const db=await openDatabase(),tx=db.transaction(STORES,'readwrite');
 await new Promise<void>((resolve,reject)=>{
  let reason:Error|undefined,pending=STORES.length*2,finished=false;const current={} as RawState;
  const abort=(e:Error)=>{reason=e;try{tx.abort();}catch{}};
  tx.oncomplete=()=>{if(!finished){finished=true;resolve();}};
  tx.onabort=()=>{if(!finished){finished=true;reject(reason??tx.error??Error('Storage transaction aborted'));}};
  // Request errors intentionally keep their default abort behavior. Do not preventDefault().
  tx.onerror=()=>{};
  const seen=(name:string,field:'keys'|'values',value:any[])=>{
   current[name]??={keys:[],values:[]};(current[name] as any)[field]=value;if(--pending)return;
   try{
    if(!rawStateEqual(expected,current))return abort(Error('Workspace changed after archive verification. Prepare, save and re-select a new archive.'));
    if(nextHistory.archives?.some(a=>a.archiveId===descriptor.archiveId)!==true)throw Error('Prepared archive descriptor is missing from next history.');
    const history=tx.objectStore('history');
    history.add(descriptor,'archive:'+descriptor.archiveId);
    for(const id of preview.revisionIds)history.delete('revision:'+id);
    for(const id of preview.reviewIds)history.delete('review:'+id);
    for(const key of preview.assetKeys)tx.objectStore('assets').delete(key);
    history.put(nextHistory.meta,'meta');
   }catch(e){abort(e as Error);}
  };
  for(const name of STORES){const store=tx.objectStore(name),kr=store.getAllKeys(),vr=store.getAll();kr.onsuccess=()=>seen(name,'keys',kr.result);vr.onsuccess=()=>seen(name,'values',vr.result);}
 });
}
/** Strict read-only normalization also checks record keys, not merely values.
 * It never repairs, rewrites or discards an unknown durable record. */
export function workspaceFromStoredRecords(raw:RawState):Workspace {
 if(Object.keys(raw).length!==STORES.length||STORES.some(n=>!raw[n]||!Array.isArray(raw[n].keys)||!Array.isArray(raw[n].values)||raw[n].keys.length!==raw[n].values.length))throw Error('Unexpected database store inventory.');
 const blank=blankWorkspace();
 const active=(name:'overlays'|'personal')=>{if(raw[name].keys.length===0)return blank[name];if(raw[name].keys.length!==1||raw[name].keys[0]!=='active')throw Error('Unexpected '+name+' storage records; integrity review required.');return raw[name].values[0];};
 const records=raw.history.values;
 if(records.length&&!raw.history.keys.includes('meta'))throw Error('History metadata is missing.');
 for(let i=0;i<records.length;i++){const r=records[i];if(!r||typeof r!=='object')throw Error('Invalid history record.');const key=r.kind==='meta'?'meta':r.kind==='head'?'head:'+r.resourceKey:r.kind==='revision'?'revision:'+r.revisionId:r.kind==='review'?'review:'+r.id:r.kind==='archive'?'archive:'+r.archiveId:null;if(!key||raw.history.keys[i]!==key)throw Error('Invalid history storage key/record; no repair was attempted.');}
 for(const name of ['imports','assets'])for(let i=0;i<raw[name].values.length;i++){const r=raw[name].values[i],key=name==='imports'?r?.manifest?.id:r?.key;if(!key||raw[name].keys[i]!==key)throw Error('Invalid '+name+' storage key; no repair was attempted.');}
 const overlays=active('overlays'),personal=active('personal');
 if(overlays.schemaVersion!==2||![2,3].includes(personal.schemaVersion))throw Error('Unknown saved-state version.');
 return {...blank,imports:raw.imports.values,overlays,personal:preparePersonal(personal),assets:raw.assets.values,history:historyFromRecords(records)};
}
export async function readIntegrityWorkspace():Promise<Workspace>{
 const db=await openDatabase();if(Array.from(db.objectStoreNames).sort().join(',')!==[...STORES].sort().join(','))throw Error('Unexpected database stores; nothing was changed.');
 return workspaceFromStoredRecords(await readRawState(db.transaction(STORES,'readonly')));
}
// Browsers may suppress the prompt unless a user has interacted. This is a last
// chance warning, never a claim that unload can finish asynchronous persistence.
if(typeof window!=='undefined'){
 window.addEventListener('beforeunload',event=>{document.dispatchEvent(new Event('atlas:before-reader-change'));store.flushPending();if(store.unsafeClose){event.preventDefault();event.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){document.dispatchEvent(new Event('atlas:before-reader-change'));store.flushPending();}});
 window.addEventListener('pagehide',()=>store.flushPending());
}
