import React,{useState} from '../vendor/react.mjs';
import {Modal} from '../components/Modal.js';
import {ResourcePicker} from '../content-hub/ResourcePicker.js';
import {requireExact} from '../references/targets.js';
import type {ReadingTarget} from '../core/reading-types.js';
export function ReadingTargetDialog({kind,catalogue,workspace,current,onSave,onClose}:any){
 const [target,setTarget]=useState<ReadingTarget|undefined>(undefined),[title,setTitle]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const label=kind==='bookmark'?'bookmark':'Read later item';
 async function save(t=target,name=title){try{if(!t)throw Error('Choose an available resource first.');requireExact(catalogue,workspace,t);if(kind==='bookmark'&&t.kind==='url')throw Error('Use Read later for external web addresses.');setBusy(true);await onSave(t,(name||requireExact(catalogue,workspace,t).title).slice(0,120));onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Modal title={'Add '+label} onClose={onClose}><p>This creates a canonical reading-list entry, not a Dashboard copy.</p><ResourcePicker catalogue={catalogue} workspace={workspace} onChange={(t,l)=>{setTarget(t);setTitle(l);}}/>{current&&<button onClick={()=>void save(current,'')}>Use current reading position</button>}<label>Title<input aria-label="Saved reading title" value={title} maxLength={120} onChange={e=>setTitle(e.target.value)}/></label>{error&&<p role="alert">{error}</p>}<div className="dialog-actions"><button onClick={onClose}>Cancel</button><button disabled={!target||!title.trim()||busy} onClick={()=>void save()}>Save {label}</button></div></Modal>;
}
