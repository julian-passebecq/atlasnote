import {COMPACTION_BLOCK_REASON} from '../durability/release-state.js';
import {consumeSavedSelection} from '../durability/ceremony.js';
import {clearArchiveAttachments} from '../durability/registry.js';
import {preflightStorage,workspaceImportBytes} from '../durability/storage-health.mjs';
import {validateHubOverlays,validateHubPersonal} from '../content-hub/validation.mjs';
import {migratePersonal} from '../core/workspace-slots.js';
import {validatePersonal} from './personal-validation.mjs';
import {repairAbsentPersonalOptionals} from '../core/personal-state.js';
import type {Workspace,Personal,Overlays,Pack,Asset} from '../core/model.js';
import {blankWorkspace,compose} from '../core/workspace.js';
import {stable,sha256} from '../core/validation.mjs';
import {emptyHistory} from '../history/model.js';
import type {HistoryData,RevisionContext,AgentReviewRecord} from '../history/model.js';
import {prepareWorkspaceHistory,advanceHistory,assertProjection,prepareEmergencySnapshot} from '../history/engine.js';
import {captureResources} from '../history/adapters.js';
import {validateHistory} from '../history/validation.mjs';
const DB_NAME='knowledge-atlas';export const DB_VERSION=3;
const STORES=['imports','overlays','personal','assets','history'];
let connection:Promise<IDBDatabase>|null=null;
let builtSource:any={packs:[],groups:[]};
export function openDatabase():Promise<IDBDatabase>{
 if(connection)return connection;
 connection=new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{const db=req.result;for(const name of ['imports','overlays','personal','assets'])if(!db.objectStoreNames.contains(name))db.createObjectStore(name);
   if(!db.objectStoreNames.contains('history')){const history=req.transaction!.db.createObjectStore('history');history.createIndex('kind','kind',{unique:false});history.createIndex('resourceKey','resourceKey',{unique:false});}};
  req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();connection=null;};resolve(req.result);};req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Database upgrade is blocked by another Atlas tab. Close the other tab, then reload.'));
 }).catch(e=>{connection=null;throw e;});return connection;
}
function request<T>(req:IDBRequest<T>):Promise<T>{return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function complete(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('Storage transaction aborted'));tx.onerror=()=>reject(tx.error??Error('Storage error'));});}
function terminal(tx:IDBTransaction){return new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('Storage transaction aborted'));});}
function historyFromRecords(records:any[]):HistoryData {return {schemaVersion:1,meta:records.find(r=>r.kind==='meta')??emptyHistory().meta,heads:records.filter(r=>r.kind==='head'),revisions:records.filter(r=>r.kind==='revision'),reviews:records.filter(r=>r.kind==='review'),...(records.some(r=>r.kind==='archive')?{archives:records.filter(r=>r.kind==='archive')}:{})};}
export async function loadWorkspace():Promise<Workspace>{
 const db=await openDatabase(),tx=db.transaction(STORES,'readonly');const [imports,overlays,personal,assets,records]=await Promise.all([request(tx.objectStore('imports').getAll()),request(tx.objectStore('overlays').get('active')),request(tx.objectStore('personal').get('active')),request(tx.objectStore('assets').getAll()),request(tx.objectStore('history').getAll())]);
 const empty=blankWorkspace();if(overlays&&overlays.schemaVersion!==2||personal&&![2,3].includes(personal.schemaVersion))throw Error('Unknown saved-state version. Data has not been reset. Export a raw recovery backup from Settings.');
 return {...empty,imports,overlays:overlays??empty.overlays,personal:preparePersonal(personal??empty.personal),assets,history:historyFromRecords(records)};
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
async function writeContent(patch:Partial<Workspace>,writes:string[],context:RevisionContext={source:'manual'}){const before=await loadWorkspace(),next=await prepareWorkspaceHistory(builtSource,{...before,...patch},context);await commitProjection(next,before.history!,writes);return next;}
export async function writeOverlays(overlays:Overlays){return writeContent({overlays},['overlays']);}
export async function writeShared(personal:Personal,overlays:Overlays){return writeContent({personal:preparePersonal(personal),overlays},['personal','overlays']);}
export async function commitImport(imports:Pack[],assets:Asset[],overlays:Overlays){const old=await loadWorkspace();return writeContent({imports:[...new Map([...old.imports,...imports].map(p=>[p.manifest.id,p])).values()],assets:[...new Map([...old.assets,...assets].map(a=>[a.key,a])).values()],overlays},['imports','assets','overlays'],{source:'import'});}
export async function restoreWorkspace(ws:Workspace){
 const previous=await loadWorkspace();let next={...ws,personal:preparePersonal(ws.personal)};
 if(next.history){await validateHistory(next.history,next.assets,true);await assertProjection(compose(builtSource,next),next);}else next=await prepareWorkspaceHistory(builtSource,next,{source:'migration',summary:'Baseline from legacy backup'});
 await commitProjection(next,previous.history!,STORES,true);return next;
}
export async function rawRecovery(){const db=await openDatabase(),tx=db.transaction(STORES,'readonly');return Object.fromEntries(await Promise.all(STORES.map(async n=>[n,await request(tx.objectStore(n).getAll())])));}
export class WorkspaceStore{
 state:Workspace={...blankWorkspace(),personal:preparePersonal(blankWorkspace().personal)};error='';saving=0;private listeners=new Set<()=>void>();private queue=Promise.resolve();private reviewPreparing=false;
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};getSnapshot=()=>this.state;
 emit(){this.listeners.forEach(f=>f());}
 setLoaded(ws:Workspace){this.state={...ws,personal:preparePersonal(ws.personal)};this.emit();}
 fail=(e:any)=>{this.error=`Changes could not be saved: ${e?.message??e}. Keep this tab open. Free browser storage, then retry, or download an emergency backup.`;this.state={...this.state};this.emit();};
 private enqueue(fn:()=>Promise<void>,reportFailure=true){this.saving++;this.state={...this.state};this.emit();const result=this.queue.then(fn);this.queue=result.catch(e=>{if(reportFailure)this.fail(e);}).finally(()=>{this.saving--;this.state={...this.state};this.emit();});return result;}
 /** Baselines are resumable in bounded transactions. An interrupted batch is all
  * or nothing; completed batches are recognized by hash and are not duplicated. */
 async initializeHistory(built:any){builtSource=built;await this.flush();this.saving++;this.emit();try{const resources=captureResources(compose(built,this.state),this.state);let history=this.state.history??emptyHistory();await validateHistory(history);
  for(let at=0;at<resources.length;at+=50){const next=await advanceHistory(history,resources.slice(at,at+50),{source:history.meta.initialized?'system':'migration',summary:history.meta.initialized?'Reviewed application source update':'V2.1.0 production baseline',sourceDetail:'Source b50c27a987fa65eee1c51d36225908621e322da7'},false);if(next.meta.epoch!==history.meta.epoch){await commitProjection({...this.state,history:next},history,[]);history=next;this.state={...this.state,history};}}
  if(!history.meta.initialized){const next=await advanceHistory(history,[],{source:'migration'},true);await commitProjection({...this.state,history:next},history,[]);history=next;}this.state={...this.state,history};this.emit();
 }finally{this.saving--;this.emit();}
 }
 personal(fn:(p:Personal)=>void){if(this.reviewPreparing)return this.enqueue(async()=>{const p=structuredClone(this.state.personal);fn(p);const canonical=preparePersonal(p);await writePersonal(canonical);this.state={...this.state,personal:canonical,generation:this.state.generation+1};this.emit();});const p=structuredClone(this.state.personal);fn(p);validateHubPersonal(p);const canonical=repairAbsentPersonalOptionals(p);this.state={...this.state,personal:canonical,generation:this.state.generation+1};this.emit();return this.enqueue(()=>writePersonal(canonical));}
 private content(next:Workspace,writes:string[],context:RevisionContext){this.state={...next,generation:this.state.generation+1};this.emit();return this.enqueue(async()=>{const previous=this.state.history??emptyHistory(),ready=await prepareWorkspaceHistory(builtSource,{...next,history:previous},context);await commitProjection(ready,previous,writes);this.state={...this.state,history:ready.history};this.emit();});}
 overlays(fn:(o:Overlays)=>void){if(this.reviewPreparing)return Promise.reject(Error('A reviewed change is being committed. Reopen this edit after it finishes.'));const o=structuredClone(this.state.overlays);fn(o);validateHubOverlays(o);return this.content({...this.state,overlays:o},['overlays'],{source:'manual'});}
 shared(fn:(p:Personal,o:Overlays)=>void){if(this.reviewPreparing)return Promise.reject(Error('A reviewed change is being committed. Reopen this edit after it finishes.'));const p=structuredClone(this.state.personal),o=structuredClone(this.state.overlays);fn(p,o);validateHubOverlays(o);return this.content({...this.state,personal:preparePersonal(p),overlays:o},['personal','overlays'],{source:'manual'});}
 async importPacks(imports:Pack[],assets:Asset[],overlays:Overlays){await this.flush();if(this.error)throw Error('Resolve the storage warning before importing.');await preflightStorage(workspaceImportBytes(imports,assets,overlays));const byPack=new Map(this.state.imports.map(p=>[p.manifest.id,p]));imports.forEach(p=>byPack.set(p.manifest.id,p));const byAsset=new Map(this.state.assets.map(a=>[a.key,a]));assets.forEach(a=>{const old=byAsset.get(a.key);if(old&&(old.sha256!==a.sha256||old.mediaType!==a.mediaType))throw Error('A historical asset key cannot be overwritten; import a new asset/pack version.');byAsset.set(a.key,a);});await this.content({...this.state,imports:[...byPack.values()],assets:[...byAsset.values()],overlays},['imports','assets','overlays'],{source:'import'});}
 async restore(ws:Workspace){await this.flush();this.saving++;this.reviewPreparing=true;this.state={...this.state};this.emit();try{await preflightStorage(workspaceImportBytes(ws.imports,ws.assets,ws.overlays)+new TextEncoder().encode(JSON.stringify(ws.history??{})).length);const restored=await restoreWorkspace(ws);clearArchiveAttachments();this.state={...restored,generation:this.state.generation+1};this.error='';this.emit();}finally{this.reviewPreparing=false;this.saving--;this.state={...this.state};this.emit();}}
 async addAsset(asset:Asset){await this.flush();return this.enqueue(async()=>{await preflightStorage(asset.bytes.length);if(await sha256(asset.bytes)!==asset.sha256)throw Error('Attachment SHA-256 mismatch');const existing=this.state.assets.find(a=>a.key===asset.key);if(existing&&existing.sha256!==asset.sha256)throw Error('A content-addressed asset cannot be overwritten');const db=await openDatabase(),tx=db.transaction('assets','readwrite'),done=complete(tx);tx.objectStore('assets').put(asset,asset.key);await done;this.state={...this.state,assets:[...this.state.assets.filter(a=>a.key!==asset.key),asset]};this.emit();});}
 /** Reviewed actions run against the live state inside the existing write queue.
  * Nothing is exposed on window. The agent facade is the only public orchestrator. */
 async reviewedMutation(fn:(ws:Workspace)=>void,context:RevisionContext){await this.flush();if(this.error)throw Error('Resolve the storage warning before accepting or staging a proposal.');return this.enqueue(async()=>{this.reviewPreparing=true;try{const before=this.state,previous=before.history??emptyHistory(),next=structuredClone(before);fn(next);next.personal=preparePersonal(next.personal);validateHubOverlays(next.overlays);const ready=await prepareWorkspaceHistory(builtSource,next,context);
   if(stable(ready.history!.reviews)!==stable(previous.reviews)&&ready.history!.meta.epoch===previous.meta.epoch)ready.history!.meta.epoch++;
   // Link accepted audit rows to revisions created by this exact batch.
   if(context.changeSetId){const review=ready.history!.reviews.find(r=>r.id===context.changeSetId);if(review?.status==='accepted')review.revisionIds=ready.history!.revisions.filter(r=>r.changeSetId===context.changeSetId).map(r=>r.revisionId);}
   const addedAssets=ready.assets.filter(a=>!before.assets.some(b=>b.key===a.key));
   for(const old of before.assets){const kept=ready.assets.find(a=>a.key===old.key);if(!kept||stable(kept)!==stable(old))throw Error('Reviewed actions cannot remove or replace existing immutable assets.');}
   for(const asset of addedAssets)if(await sha256(asset.bytes)!==asset.sha256)throw Error('Restored historical asset hash mismatch');
   if(addedAssets.length)await preflightStorage(addedAssets.reduce((n,a)=>n+a.bytes.length,0));
   await validateHistory(ready.history!);try{await commitProjection(ready,previous,['overlays','personal',...(addedAssets.length?['assets']:[])],false,before.personal);}catch(e){this.fail(e);throw e;}this.state={...ready,generation:this.state.generation+1};this.emit();}finally{this.reviewPreparing=false;}
  },false);}
 async flush(){let pending;do{pending=this.queue;await pending;}while(pending!==this.queue);}
 async backupSnapshot(){await this.flush();return this.error&&this.state.history?prepareEmergencySnapshot(builtSource,this.state):structuredClone(this.state);}
 async retry(){await this.flush();return this.enqueue(async()=>{const previous=await loadWorkspace();if((previous.history?.meta.epoch??0)!==(this.state.history?.meta.epoch??0))throw Error('Another tab advanced history. Export your unsaved recovery copy, then reload.');const next=await prepareWorkspaceHistory(builtSource,this.state,{source:'manual',summary:'Retry unsaved changes'});await commitProjection(next,previous.history!,['imports','assets','overlays','personal']);this.state={...next};this.error='';this.emit();});}
 get unsafeClose(){return this.saving>0||!!this.error;}
 /** Destructive compaction remains UI-disabled until the browser fault matrix
  * passes. The writer itself is bound to a trusted, single-use saved-file receipt
  * and an exact five-store snapshot captured at selection time. */
 async compactArchive(ticket:object,event:Event,_resolveAsset:(key:string)=>Promise<Asset|undefined>){
  const receipt=consumeSavedSelection(ticket,event);
  if(!receipt?.plan?.workspace?.history)throw Error(COMPACTION_BLOCK_REASON);
  await this.flush();
  if(this.error)throw Error('Resolve the storage warning before compacting history.');
  return this.enqueue(async()=>{
   const db=await openDatabase(),tx=db.transaction(STORES,'readwrite'),done=terminal(tx);
   try{
    const current=await readRawState(tx);
    if(stable(current)!==stable(receipt.rawState)){tx.abort();await done.catch(()=>{});throw Error('Workspace changed after saved-file verification. Prepare, save and re-select a new archive. Nothing was removed.');}
    if(receipt.previewHash!==receipt.plan.previewHash){tx.abort();await done.catch(()=>{});throw Error('Compaction preview changed after saved-file verification. Prepare a new archive.');}
    const history=tx.objectStore('history'),assets=tx.objectStore('assets'),preview=receipt.plan.preview,next=receipt.plan.workspace as Workspace;
    if(next.history!.meta.epoch!==(this.state.history?.meta.epoch??-1)+1){tx.abort();await done.catch(()=>{});throw Error('Compaction epoch mismatch. Reload before retrying.');}
    history.add(receipt.archive.descriptor,'archive:'+receipt.archive.descriptor.archiveId);
    for(const id of preview.revisionIds)history.delete('revision:'+id);
    for(const id of preview.reviewIds)history.delete('review:'+id);
    for(const key of preview.assetKeys)assets.delete(key);
    history.put(next.history!.meta,'meta');
    await done;
    const reopened=await readIntegrityWorkspace();
    await validateHistory(reopened.history!,reopened.assets,true);
    this.state={...next,generation:this.state.generation+1};
    this.error='';
    this.emit();
    return structuredClone(preview);
   }catch(e){try{tx.abort();}catch{}await done.catch(()=>{});throw e;}
  },false);
 }
}

function preparePersonal(p:Personal):Personal{const repaired=repairAbsentPersonalOptionals(p);validatePersonal(repaired);return migratePersonal(repaired);}
export const store=new WorkspaceStore();

// Read all five stores from one consistent readonly transaction.
export type RawState=Record<string,{keys:IDBValidKey[];values:any[]}>;
async function readRawState(tx:IDBTransaction):Promise<RawState>{return Object.fromEntries(await Promise.all(STORES.map(async name=>{const store=tx.objectStore(name),[keys,values]=await Promise.all([request(store.getAllKeys()),request(store.getAll())]);return [name,{keys,values}];})));}
export async function captureRawState():Promise<RawState>{const db=await openDatabase(),tx=db.transaction(STORES,'readonly'),done=terminal(tx);const raw=await readRawState(tx);await done;return raw;}
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
 window.addEventListener('beforeunload',event=>{document.dispatchEvent(new Event('atlas:before-reader-change'));if(store.unsafeClose){event.preventDefault();event.returnValue='';}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')document.dispatchEvent(new Event('atlas:before-reader-change'));});
}
