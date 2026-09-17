import React from '../vendor/react.mjs';
import type {Catalogue,Overlays} from '../core/model.js';
import type {TaxonomyRef,SubjectKey} from './model.js';
import {SUBJECTS} from './model.js';
import {sharedFolders} from './taxonomy.js';
/** Folder IDs are shared, stable Notebook IDs. An omitted subject is never silently assigned. */
export function TaxonomyPicker({catalogue,overlays,value,onChange,label='Classification',required=false}:{catalogue:Catalogue;overlays:Overlays;value?:TaxonomyRef;onChange:(v?:TaxonomyRef)=>void;label?:string;required?:boolean}){
 const folders=sharedFolders(catalogue,overlays).filter(f=>f.subject===value?.subject);
 return <fieldset className="taxonomy-picker"><legend>{label}</legend><label>Subject<select aria-label={label+' subject'} required={required} value={value?.subject??''} onChange={e=>onChange(e.target.value?{subject:e.target.value as SubjectKey}:undefined)}><option value="">Unclassified</option>{SUBJECTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label><label>Notebook folder<select aria-label={label+' folder'} value={value?.folderId??''} disabled={!value} onChange={e=>{if(!value)return;const f=folders.find(f=>f.id===e.target.value);onChange(f?{subject:value.subject,folderId:f.id,path:[...f.path]}:{subject:value.subject});}}><option value="">Unfiled</option>{folders.map(f=><option key={f.id} value={f.id}>{f.path.join(' / ')}</option>)}</select></label>{value?.path?.length&&!value.folderId?<small>Original path: {value.path.join(' / ')}. Select a shared folder to file it.</small>:null}</fieldset>;
}
