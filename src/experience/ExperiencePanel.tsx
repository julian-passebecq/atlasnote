import React,{useMemo,useState} from '../vendor/react.mjs';
import {FloatingPanel} from '../components/FloatingPanel.js';
import {Icon} from '../components/Icon.js';
import {LIBRARY_TYPES,SUBJECTS} from '../content-hub/model.js';
import type {LibraryMode} from '../content-hub/model.js';
import type {Catalogue,Overlays,Session,WorkspaceNumber} from '../core/model.js';
import {PRESETS,validateExperience,isAllContent,evaluate} from './profile.mjs';
import {experienceCounts,presetProfile} from './facts.js';
import type {ExperienceProfile,ResourceFacts} from './facts.js';
type Props={slot:WorkspaceNumber;session:Session|undefined;catalogue:Catalogue;overlays:Overlays;facts:Map<string,ResourceFacts>;onApply:(slot:WorkspaceNumber,profile:ExperienceProfile|undefined)=>void;onClose:()=>void};
/** One right-side editor for one explicitly labelled workspace. Edits are a
 * draft until Apply; Cancel discards. The panel is pinned to the slot it was
 * opened for: switching workspaces never redirects Apply to another slot.
 * Visible, loaded, offline and owned are different things; this panel only
 * changes what this workspace shows and searches. Nothing is deleted. */
export function ExperiencePanel({slot,session,catalogue,overlays,facts,onApply,onClose}:Props){
 const saved=session?.experience as ExperienceProfile|undefined;
 const [draft,setDraft]=useState<ExperienceProfile>(()=>structuredClone(saved??presetProfile('all')));
 const [pdfQuery,setPdfQuery]=useState(''),[error,setError]=useState('');
 const counts=useMemo(()=>experienceCounts(draft,facts),[draft,facts]);
 const current=useMemo(()=>experienceCounts((saved??presetProfile('all')),facts),[saved,facts]);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved??presetProfile('all'));
 const edit=(fn:(d:ExperienceProfile)=>void)=>{setError('');setDraft(d=>{const next=structuredClone(d);fn(next);return next;});};
 const subjectOn=(id:string)=>draft.subjects.mode==='all'||draft.subjects.mode==='selected'&&!!draft.subjects.ids?.includes(id);
 function toggleSubject(id:string){edit(d=>{const on=new Set(d.subjects.mode==='all'?SUBJECTS.map(s=>s.id):d.subjects.mode==='selected'?d.subjects.ids:[]);if(on.has(id))on.delete(id);else on.add(id);d.subjects=on.size===SUBJECTS.length?{mode:'all'}:on.size?{mode:'selected',ids:SUBJECTS.map(s=>s.id).filter(x=>on.has(x))}:{mode:'none'};});}
 const pdfs=useMemo(()=>catalogue.documents.map(d=>({id:d.pageId,title:d.title,subject:facts.get(d.pageId)?.subject})),[catalogue,facts]);
 const pdfOn=(id:string)=>draft.pdfs.mode==='all'||draft.pdfs.mode==='selected'&&!!draft.pdfs.ids?.includes(id);
 function togglePdf(id:string){edit(d=>{const on=new Set(d.pdfs.mode==='all'?pdfs.map(p=>p.id):d.pdfs.mode==='selected'?d.pdfs.ids:[]);if(on.has(id))on.delete(id);else on.add(id);d.pdfs=on.size?{mode:'selected',ids:pdfs.map(p=>p.id).filter(x=>on.has(x))}:{mode:'none'};});}
 const title=(id:string)=>facts.get(id)?.title??id;
 const presetName=PRESETS.find((p:any)=>p.id===draft.presetId)?.name??draft.name??'Custom';
 function apply(){try{validateExperience(draft);onApply(slot,isAllContent(draft)&&draft.presetId==='all'?undefined:draft);onClose();}catch(e){setError((e as Error).message);}}
 const shownPdfs=pdfs.filter(p=>!pdfQuery.trim()||p.title.toLocaleLowerCase().includes(pdfQuery.trim().toLocaleLowerCase()));
 return <FloatingPanel title={'Workspace '+slot+' — '+(saved?.name??(saved?'Custom':'All content'))} className="experience-panel" onClose={onClose}>
  <p className="experience-scope">Changes apply only to <strong>Workspace {slot}</strong>. Open tabs, reading positions, quiz progress and stored resources are kept.</p>
  <label className="experience-field"><span>Experience</span><select aria-label="Experience preset" value={draft.presetId} onChange={e=>{const next=presetProfile(e.target.value);edit(d=>{Object.assign(d,{...next,include:d.include,exclude:d.exclude});});}}>{PRESETS.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
  <fieldset className="experience-group"><legend>Content types</legend>
   {LIBRARY_TYPES.map(t=><label key={t.id} className="experience-toggle"><input type="checkbox" checked={draft.types[t.id]} onChange={e=>edit(d=>{d.types[t.id as LibraryMode]=e.target.checked;})}/><span>{t.label}</span><small>{counts.byType[t.id]}</small></label>)}
  </fieldset>
  <fieldset className="experience-group"><legend>Subjects</legend>
   {SUBJECTS.map(s=><label key={s.id} className="experience-toggle"><input type="checkbox" checked={subjectOn(s.id)} onChange={()=>toggleSubject(s.id)}/><span>{s.label}</span><small>{counts.bySubject[s.id]??0}</small></label>)}
   {draft.subjects.mode==='none'&&<p className="experience-warning" role="status">No subject selected: only explicitly included resources are shown.</p>}
  </fieldset>
  {draft.types.pdfs&&<fieldset className="experience-group"><legend>PDFs</legend>
   <div className="experience-radio"><label><input type="radio" name={'exp-pdfs-'+slot} checked={draft.pdfs.mode==='all'} onChange={()=>edit(d=>{d.pdfs={mode:'all'};})}/>All PDFs in selected subjects</label><label><input type="radio" name={'exp-pdfs-'+slot} checked={draft.pdfs.mode!=='all'} onChange={()=>edit(d=>{d.pdfs=d.pdfs.mode==='all'?{mode:'selected',ids:pdfs.filter(p=>evaluate({...d,pdfs:{mode:'all'}},facts.get(p.id)??{id:p.id,type:'pdfs'}).visible).map(p=>p.id)}:d.pdfs;if(d.pdfs.mode==='selected'&&!d.pdfs.ids?.length)d.pdfs={mode:'none'};})}/>Selected PDFs only</label></div>
   {draft.pdfs.mode!=='all'&&<><input className="experience-search" aria-label="Find a PDF" placeholder="Find a PDF..." value={pdfQuery} onChange={e=>setPdfQuery(e.target.value)}/>
    <div className="experience-list">{shownPdfs.slice(0,200).map(p=><label key={p.id} className="experience-toggle"><input type="checkbox" checked={pdfOn(p.id)} onChange={()=>togglePdf(p.id)}/><span title={p.title}>{p.title}</span><small>{SUBJECTS.find(s=>s.id===p.subject)?.label??'Unclassified'}</small></label>)}{!shownPdfs.length&&<p className="experience-note">No PDF matches.</p>}</div></>}
  </fieldset>}
  {(draft.include.length>0||draft.exclude.length>0)&&<fieldset className="experience-group"><legend>Exceptions</legend>
   {draft.include.map((id:string)=><div key={'i'+id} className="experience-exception"><Icon name="plus" size={13}/><span title={id}>Always shown: {title(id)}</span><button type="button" className="text-button" onClick={()=>edit(d=>{d.include=d.include.filter((x:string)=>x!==id);})}>Remove</button></div>)}
   {draft.exclude.map((id:string)=><div key={'e'+id} className="experience-exception"><Icon name="close" size={13}/><span title={id}>Hidden: {title(id)}</span><button type="button" className="text-button" onClick={()=>edit(d=>{d.exclude=d.exclude.filter((x:string)=>x!==id);})}>Remove</button></div>)}
   <p className="experience-note">An included resource is shown even outside the selected subjects, but never when its content type is off.</p>
  </fieldset>}
  <details className="experience-advanced"><summary>Counts, loading and offline</summary>
   <dl>
    <dt>Visible after Apply</dt><dd>{counts.visible} of {counts.total} library resources</dd>
    <dt>Visible now</dt><dd>{current.visible} of {current.total}</dd>
    <dt>Currently loaded</dt><dd>Not the same as visible. This build still loads the reviewed catalogue at startup; the Experience limits navigation, search and counts in this workspace.</dd>
    <dt>Offline / stored</dt><dd>Unchanged. Hidden resources stay on this device, in backups and in history.</dd>
   </dl>
  </details>
  {error&&<p className="experience-warning" role="alert">{error}</p>}
  <div className="experience-actions">
   <button type="button" className="text-button" onClick={()=>edit(d=>{Object.assign(d,presetProfile('all'));})}>Reset to All content</button>
   <span className="spacer"/>
   <button type="button" onClick={onClose}>Cancel</button>
   <button type="button" className="primary" disabled={!dirty} onClick={apply}>Apply to Workspace {slot}</button>
  </div>
  <p className="sr-only" aria-live="polite">{presetName}: {counts.visible} resources visible after Apply.</p>
 </FloatingPanel>;
}
