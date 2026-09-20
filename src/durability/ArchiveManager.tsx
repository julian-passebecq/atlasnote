import {COMPACTION_BLOCKED,COMPACTION_BLOCK_REASON} from './release-state.js';
import React,{useEffect,useRef,useState,useSyncExternalStore} from '../vendor/react.mjs';
import {store} from '../storage/database.js';
import {captureWorkspaceSnapshot} from '../storage/workspace-snapshot.js';
import {makeHistoryArchive} from './archive.mjs';
import {selectSavedArchive,discardSavedSelection,consumeSavedSelection} from './ceremony.js';
import {attachArchive,detachArchive,isArchiveAttached,subscribeArchives,archiveAttachmentEpoch} from './registry.js';
import {getBuildIdentity} from './provenance.js';
import {download,unzipBounded} from '../storage/archives.mjs';
import {verifyRecoveryBundle} from './recovery.js';
import {schemas} from '../app/load.js';
import {Icon} from '../components/Icon.js';
import type {VerifiedArchive} from './model.js';
export const readableBytes=(n:number)=>n>=1024*1024?(n/1024/1024).toFixed(2)+' MiB':n>=1024?(n/1024).toFixed(1)+' KiB':n+' bytes';
export function ArchiveManager({built,assets,resourceKey,disabled=false}:any){
 const ws=useSyncExternalStore(store.subscribe,store.getSnapshot);useSyncExternalStore(subscribeArchives,archiveAttachmentEpoch);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[retain,setRetain]=useState(2),[selected,setSelected]=useState<string[]>([]);
 const [candidate,setCandidate]=useState<VerifiedArchive|undefined>(undefined),[downloaded,setDownloaded]=useState(false),[preview,setPreview]=useState<any>(null),[confirmed,setConfirmed]=useState(false);
 const ticket=useRef<object|undefined>(undefined),inFlight=useRef(false);
 const clear=()=>{discardSavedSelection(ticket.current);ticket.current=undefined;setPreview(null);setConfirmed(false);};
 useEffect(()=>()=>discardSavedSelection(ticket.current),[]);
 async function run(fn:()=>Promise<void>){if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setMessage('');try{await fn();}catch(e){setError((e as Error).message);}finally{inFlight.current=false;setBusy(false);}}
 async function prepare(){clear();setCandidate(undefined);setDownloaded(false);if(store.error)throw Error('Resolve unsaved changes before preparing compaction. Workspace backup remains available for emergency export.');const snapshot=await captureWorkspaceSnapshot();const archive=await makeHistoryArchive(snapshot,await getBuildIdentity(),assets.asset,{retain,...(resourceKey?{resourceKeys:[resourceKey]}:selected.length?{resourceKeys:selected}:{})});setCandidate(archive);setMessage('Archive bytes verified. Download, then independently select the saved file. Nothing has been removed.');}
 async function attachFiles(files:File[]){for(const file of files){const {transfer}=await unzipBounded(file);if(transfer?.kind==='complete-recovery'){const bundle=await verifyRecoveryBundle(file,built,await schemas());for(const archive of bundle.archives)await attachArchive(archive.bytes,store.state.history!);}else await attachArchive(file,store.state.history!);}setMessage('Exact verified archives attached for this session. They remain external files; no history or proposal was changed.');}
 const unavailable=disabled||busy||store.saving>0;
 return <section className="durability-section" aria-label="History archival and attachments">
  <h3><Icon name="archive"/> History archives</h3>
  <p role="status" className="warning-text">{COMPACTION_BLOCK_REASON}</p>
  <p>Archive only an oldest contiguous prefix. Current heads and at least {retain} live version(s) stay in this browser. Pending proposals stay live. No automatic pruning.</p>
  <details><summary>Prepare a verified history archive</summary>
   <label className="field">Live versions to retain per resource<input aria-label="Live versions to retain" type="number" min="1" max="2000" value={retain} disabled={unavailable} onChange={e=>{clear();setCandidate(undefined);setRetain(Number(e.target.value));}}/></label>
   {!resourceKey&&<details><summary>Resource selection (all resources by default)</summary><label className="field">Choose one or more resources, or leave empty for all<select multiple size={6} aria-label="Archive resources" disabled={unavailable} value={selected} onChange={e=>{clear();setCandidate(undefined);setSelected(Array.from(e.target.selectedOptions,(o:any)=>o.value));}}>{ws.history?.heads.map(head=><option key={head.resourceKey} value={head.resourceKey}>{head.resourceKey} / v{head.number}</option>)}</select></label></details>}
   <button data-durability-action="prepare-archive" disabled={unavailable||!!store.error} onClick={()=>void run(prepare)}>Prepare and verify archive</button>
   {candidate&&<div className="durability-preview" data-archive-id={candidate.descriptor.archiveId}>
    <p><strong>{candidate.descriptor.counts.revisions}</strong> revisions, {candidate.descriptor.counts.reviews} closed reviews, {candidate.descriptor.counts.assets} assets / {readableBytes(candidate.bytes.length)} ZIP.</p>
    <p><code>{candidate.descriptor.archiveId}</code><br/>Root SHA-256: <code>{candidate.descriptor.rootHash}</code><br/>Saved-file SHA-256: <code>{candidate.fileHash}</code></p>
    <button data-durability-action="download-archive" disabled={unavailable} onClick={()=>{download(candidate.bytes,candidate.descriptor.archiveId+'.atlas-history.zip');setDownloaded(true);}}>1. Download verified archive</button>
    <label className="file-picker">2. Re-select the actual saved archive<input aria-label="Re-select saved archive" type="file" accept=".zip" disabled={unavailable||!downloaded} onChange={e=>{const input=e.target as HTMLInputElement,ev=e.nativeEvent as Event;clear();void run(async()=>{try{const selected=await selectSavedArchive(ev,candidate,store.state,built,assets.asset);ticket.current=selected.ticket;setPreview(selected.preview);setMessage('Saved file independently verified. Review the exact deletion set before confirming.');}finally{input.value='';}});}}/></label>
    {preview&&<div data-durability-preview>
     <p>Remove {preview.revisionIds.length} live snapshots, {preview.reviewIds.length} closed reviews and {preview.assetKeys.length} exclusively archived assets ({readableBytes(preview.assetBytes)}). Live structured history: {readableBytes(preview.structuredBytesBefore)} to {readableBytes(preview.structuredBytesAfter)}.</p>
     <details><summary>Exact removal set and byte preview</summary><pre>{JSON.stringify(preview,null,2)}</pre></details>
     <label className="inline-check"><input type="checkbox" aria-label="Confirm saved archive retention" checked={confirmed} disabled={unavailable} onChange={e=>setConfirmed(e.target.checked)}/>I have re-selected the saved archive and will keep it outside this browser. Clearing site data cannot recover an unsaved archive.</label>
    </div>}
    <button className="primary" data-archive-commit data-durability-action="compact-archive" disabled={COMPACTION_BLOCKED||unavailable||!preview||!confirmed||!ticket.current||!!store.error} onClick={e=>{const ev=e.nativeEvent as Event,receipt=ticket.current;void run(async()=>{if(!receipt)throw Error('Re-select the saved file first.');try{const selection=consumeSavedSelection(receipt,ev);await store.compactArchive(selection,assets.asset);await attachArchive(candidate.bytes,store.state.history!);setCandidate(undefined);setDownloaded(false);setMessage('Compaction committed atomically. Current content and all heads are unchanged. The saved archive is attached for this session.');}finally{clear();}});}}>{COMPACTION_BLOCKED?'3. Compaction blocked pending release QA':'3. Compact verified archive (qualification only)'}</button>
   </div>}
  </details>
  <label className="file-picker">Attach saved archives or a complete recovery bundle<input aria-label="Attach history archives" type="file" accept=".zip" multiple disabled={unavailable} onChange={e=>{const files=Array.from(e.target.files??[]) as File[];e.target.value='';if(files.length)void run(()=>attachFiles(files));}}/></label>
  <p className="secondary">Archive identities persist. Attached bytes stay in memory only to preserve recovered capacity. After reload, select the same archive or recovery bundle again. Missing files never fall back to current content.</p>
  {(ws.history?.archives??[]).map(a=><details key={a.archiveId} className="archive-record" data-archive-record={a.archiveId}><summary>{isArchiveAttached(ws.history,a.archiveId)?'Attached / verified':'Missing file'} / {a.counts.revisions} versions / {a.archiveId}</summary><p>Root: <code>{a.rootHash}</code></p><p>{a.counts.assets} historical assets / {readableBytes(a.counts.assetBytes)}. Created {new Date(a.createdAt).toLocaleString()}.</p>{isArchiveAttached(ws.history,a.archiveId)&&<button disabled={unavailable} data-durability-action="detach-archive" onClick={()=>detachArchive(a.archiveId)}>Detach this archive</button>}</details>)}
  {busy&&<p role="status">Validating complete bytes and immutable history...</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="error-message">{error}</p>}
 </section>;
}
