import React,{useState} from '../vendor/react.mjs';
import type {Personal} from '../core/model.js';
import type {SaveScope,StateSave} from '../core/saved-states-types.js';
import {saveScope,scopeLabel,sessionSummary,STATE_SAVE_LIMITS} from '../core/saved-states.js';
import {Modal,Field} from './Modal.js';
import {Icon} from './Icon.js';
type Props={personal:Personal;busy:boolean;onClose:()=>void;onSave:(scope:SaveScope)=>Promise<void>;onRestore:(id:string)=>Promise<void>;onRename:(id:string,title:string,note:string)=>Promise<void>;onDelete:(id:string)=>Promise<void>};
const date=(n:number)=>{const d=new Date(n);return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Unknown time';};
export function SavedStatesDialog({personal,busy,onClose,onSave,onRestore,onRename,onDelete}:Props){
 const [scope,setScope]=useState<SaveScope>(personal.activeWorkspaceSlot??1),[editing,setEditing]=useState<string|null>(null),[title,setTitle]=useState(''),[note,setNote]=useState(''),[deleting,setDeleting]=useState<string|null>(null);
 const data=personal.savedStates,entries=data?.entries.filter(e=>saveScope(e)===scope)??[],undo=data?.safety[scope];
 const edit=(e:StateSave)=>{setEditing(e.id);setTitle(e.title);setNote(e.note);setDeleting(null);};
 return <Modal title="Saved workspace states" onClose={onClose}>
  <div className="state-saves-manager">
   <p className="secondary">Resume tabs, panes, reading positions, filters and layout. Notes and PDF files are not rolled back. Use Settings for a full library backup.</p>
   <div className="save-scope-tabs" role="tablist" aria-label="Saved-state scopes">{([1,2,3,4,5,'all'] as SaveScope[]).map(n=><button key={n} role="tab" aria-selected={scope===n} aria-label={scopeLabel(n)+' saves'} onClick={()=>{setScope(n);setEditing(null);setDeleting(null);}}>{n==='all'?'All':n}</button>)}</div>
   <div className="save-list-heading"><strong>{scopeLabel(scope)}</strong><span>{entries.length} / {STATE_SAVE_LIMITS.perScope}</span><button disabled={busy||entries.length>=STATE_SAVE_LIMITS.perScope} onClick={()=>void onSave(scope)}><Icon name="plus" size={14}/>Save state</button></div>
   {undo&&<div className="save-undo"><span><strong>Before last restore</strong><small>{date(undo.createdAt)}</small></span><button disabled={busy} onClick={()=>void onRestore(undo.id)}>Undo last restore</button></div>}
   <div className="saved-state-list" role="tabpanel" aria-label={scopeLabel(scope)+' saved states'}>
    {!entries.length&&<p className="save-empty">No saved state yet. Save a checkpoint when you finish a study session.</p>}
    {entries.map(e=><article className="saved-state-row" key={e.id} data-save-id={e.id}>
     {editing===e.id?<form onSubmit={async ev=>{ev.preventDefault();try{await onRename(e.id,title,note);setEditing(null);}catch{}}}>
      <Field label="Save title"><input aria-label="Save title" required maxLength={120} value={title} onChange={ev=>setTitle(ev.target.value)}/></Field>
      <Field label="Progress / next step (optional)"><textarea aria-label="Progress / next step" maxLength={500} rows={2} value={note} onChange={ev=>setNote(ev.target.value)}/></Field>
      <div className="button-row"><button disabled={busy||!title.trim()} type="submit">Save details</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
     </form>:<><strong className="save-title">{e.title}</strong><small>{date(e.createdAt)} / {sessionSummary(e)}</small>{e.note&&<p className="save-note">{e.note}</p>}
      <div className="save-row-actions"><button disabled={busy} onClick={()=>void onRestore(e.id)}>Restore</button><button disabled={busy} onClick={()=>edit(e)}>Rename / note</button>{deleting===e.id?<><span>Delete this save?</span><button disabled={busy} onClick={()=>{void onDelete(e.id).catch(()=>{});setDeleting(null);}}>Confirm delete</button><button onClick={()=>setDeleting(null)}>Cancel</button></>:<button disabled={busy} onClick={()=>setDeleting(e.id)}>Delete</button>}</div>
     </>}
    </article>)}
   </div>
   <details className="save-history"><summary>Recent activity <span className="secondary">last {STATE_SAVE_LIMITS.history} actions</span></summary>
    {data?.history.length?<ol>{data.history.map(e=><li key={e.id}><span>{e.action==='save'?'Saved':e.action==='restore'?'Restored':e.action==='delete'?'Deleted':'Renamed'} <strong>{e.title}</strong></span><small>{scopeLabel(e.scope)} / {date(e.createdAt)}</small></li>)}</ol>:<p className="secondary">No activity yet.</p>}
   </details>
   <small className="secondary">Local to this browser. Each restore creates an undo point for its scope. Manual saves are never silently replaced.</small>
  </div>
 </Modal>;
}
