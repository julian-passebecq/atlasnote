import React,{useState,useMemo} from '../vendor/react.mjs';
import {Modal,Field} from '../components/Modal.js';
import {store} from '../storage/database.js';
import type {Workspace} from '../core/model.js';
import type {DashboardItem,TaxonomyRef} from './model.js';
import {captureRows,downloadJSON} from './content.js';
import {splitCaptureText} from './dashboard.js';
import {TaxonomyPicker} from './TaxonomyPicker.js';
import {planningView,localDateKey,addDays,rescheduleTask,planHandoff,applyHandoff,planningOverview,canonicalJSON,serviceReferenceNote,SERVICE_TEMPLATES,HANDOFF_SCHEMA,OVERVIEW_SCHEMA,DUE_SOON_DAYS} from './planning.js';
import type {PlanningTask,HandoffPlan,HandoffReceipt} from './planning.js';
import {detectSecrets,secretMessage} from './secrets.js';

const BUCKET_LABEL={overdue:'Overdue',today:'Today',soon:'Due soon',later:'Later',unscheduled:'Unscheduled'} as const;
type Focus='next'|'open'|'agenda'|'notes'|'reading'|'none';
async function copyText(text:string){await navigator.clipboard.writeText(text);}

/** Read-only planning projection of the existing captures; tasks without a date stay unscheduled. */
export function PlanningPanel({workspace,include,onOpen,onEdit,onStatus}:{workspace:Workspace;include:(id:string)=>boolean;onOpen:(t:any)=>void;onEdit:(i:DashboardItem)=>void;onStatus:(id:string,status:string)=>void}){
 const [focus,setFocus]=useState<Focus>('next'),[all,setAll]=useState(false),[error,setError]=useState(''),today=localDateKey();
 function reschedule(id:string,choice:string){if(!choice)return;setError('');const day=choice==='none'?null:addDays(today,Number(choice));void Promise.resolve().then(()=>store.personal(p=>rescheduleTask(p,id,day))).catch(e=>setError((e as Error).message));}
 const view=useMemo(()=>planningView(workspace.personal,today,include),[workspace.personal.dashboardItems,workspace.personal.readLater,today,include]);
 const next=view.tasks.filter(t=>t.bucket==='overdue'||t.bucket==='today'||t.bucket==='soon'),count=(b:string)=>view.tasks.filter(t=>t.bucket===b).length,dated=view.tasks.filter(t=>t.dueDate).length;
 const tabs:[Focus,string,number][]=[['next','Next up',next.length],['open','Open tasks',view.tasks.length],['agenda','Agenda',dated],['notes','Notes',view.notes.length],['reading','Reading queue',view.reading.length]];
 function task(t:PlanningTask){const {title}=splitCaptureText(t.item.text);return <li key={t.item.id} className={'planning-task '+t.bucket} data-planning-item={t.item.id}>
  <button className="planning-title" aria-label={'Planning task: '+title} onClick={()=>onEdit(t.item)}>{title}</button>
  <span className="planning-meta">{t.dueDate?<time dateTime={t.dueDate} className={'planning-due '+t.bucket}>{BUCKET_LABEL[t.bucket]} · {t.dueDate}</time>:<small>Unscheduled</small>}{t.item.important&&<small className="important-label">Important</small>}{t.item.origin&&<small title={'Imported from Power Ops ('+t.item.origin.objectId+')'}>Power Ops</small>}</span>
  <select className="planning-reschedule" aria-label={'Reschedule '+title} value="" onChange={e=>reschedule(t.item.id,e.target.value)}><option value="">Reschedule…</option><option value="0">Today</option><option value="1">Tomorrow</option><option value="7">In a week</option>{t.dueDate&&<option value="none">No date</option>}</select>
  <button aria-label={'Mark done from planning: '+title} onClick={()=>onStatus(t.item.id,'done')}>Done</button></li>;}
 function limited<T>(rows:T[],render:(x:T)=>any){const shown=all?rows:rows.slice(0,8);return <>{shown.map(render)}{rows.length>8&&<li><button className="text-button" onClick={()=>setAll(!all)}>{all?'Show less':'Show all ('+rows.length+')'}</button></li>}</>;}
 let body:any=null;
 if(focus==='next')body=next.length?<ol className="planning-list">{limited(next,task)}</ol>:<p className="planning-empty">Nothing overdue or due in the next {DUE_SOON_DAYS} days. {count('unscheduled')?count('unscheduled')+' open task(s) have no date.':''}</p>;
 if(focus==='open')body=view.tasks.length?<ol className="planning-list">{limited(view.tasks,task)}</ol>:<p className="planning-empty">No open task.</p>;
 if(focus==='agenda')body=view.agenda.length?<div className="planning-agenda">{view.agenda.map(day=><section key={day.date} aria-label={'Due '+day.date}><h3><time dateTime={day.date}>{day.date===today?'Today':new Date(day.date+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})}</time>{day.date<today&&<small className="planning-due overdue">Overdue</small>}</h3><ol className="planning-list">{day.tasks.map(task)}</ol></section>)}{count('unscheduled')>0&&<p className="planning-empty">{count('unscheduled')} undated task(s) are not placed on the agenda.</p>}</div>:<p className="planning-empty">No dated open task. Tasks without a date are never placed on the agenda.</p>;
 if(focus==='notes')body=view.notes.length?<ul className="planning-list">{limited(view.notes,n=>{const {title,rest}=splitCaptureText(n.text);return <li key={n.id}><button className="planning-title" aria-label={'Planning note: '+title} onClick={()=>onEdit(n)}>{title}</button>{rest&&<small className="planning-preview">{rest.slice(0,160)}</small>}</li>;})}</ul>:<p className="planning-empty">No quick note.</p>;
 if(focus==='reading')body=view.reading.length?<ul className="planning-list">{limited(view.reading,r=><li key={r.id}>{r.target.kind==='url'?<a className="planning-title" aria-label={'Planning reading: '+r.title} href={r.target.url} target="_blank" rel="noopener noreferrer">{r.title}</a>:<button className="planning-title" aria-label={'Planning reading: '+r.title} onClick={()=>onOpen(r.target)}>{r.title}</button>}{r.note&&<small className="planning-preview">{r.note.slice(0,160)}</small>}</li>)}</ul>:<p className="planning-empty">Reading queue is empty.</p>;
 return <section className="planning-panel" aria-label="Planning">
  <div className="planning-summary" role="group" aria-label="Planning views">{tabs.map(([id,label,n])=><button key={id} aria-pressed={focus===id} onClick={()=>{setFocus(focus===id?'none':id);setAll(false);}}>{label} <strong>{n}</strong></button>)}
   <span className="planning-counts" aria-label="Due summary">{count('overdue')>0&&<small className="planning-due overdue">{count('overdue')} overdue</small>}<small>{count('today')} today</small><small>{count('soon')} in {DUE_SOON_DAYS} days</small></span></div>
  {focus!=='none'&&body}
  {error&&<p role="alert" className="error-message">{error}</p>}
 </section>;
}

export function HandoffImportDialog({workspace,onClose}:{workspace:Workspace;onClose:()=>void}){
 const [source,setSource]=useState(''),[plan,setPlan]=useState<HandoffPlan|null>(null),[replace,setReplace]=useState<Set<string>>(new Set()),[error,setError]=useState(''),[receipt,setReceipt]=useState<HandoffReceipt|null>(null),[busy,setBusy]=useState(false),[copied,setCopied]=useState('');
 function preview(text=source){setError('');setReceipt(null);setReplace(new Set());try{setPlan(planHandoff(workspace.personal,text));}catch(e){setPlan(null);setError((e as Error).message);}}
 async function file(f?:File){if(!f)return;if(f.size>1024*1024){setError('The handoff exceeds the 1 MiB limit.');return;}const text=await f.text();setSource(text);preview(text);}
 async function apply(){if(!plan)return;setBusy(true);setError('');let result:HandoffReceipt|undefined;try{await store.personal(p=>{result=applyHandoff(p,source,plan.fingerprint,replace);});setReceipt(result!);setPlan(null);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const writes=plan?plan.counts.create+plan.counts.update+[...replace].filter(id=>plan.rows.some(r=>r.action==='conflict'&&r.sourceObjectId===id)).length:0;
 const label={create:'New',update:'Update',unchanged:'Unchanged',conflict:'Edited here',skip:'Skipped',refuse:'Refused'} as const;
 return <Modal wide title="Import from Power Ops" onClose={onClose}>
  <p className="secondary">Reviewed intake of a <code>{HANDOFF_SCHEMA}</code> file: notes, tasks, links and Read later references. Nothing is written until you confirm. Re-importing the same source IDs updates or skips them instead of duplicating. The Power Ops items are never changed from here, and fields that look like passwords, tokens or credentials are refused.</p>
  {!receipt&&<><Field label="Handoff JSON"><textarea aria-label="Power Ops handoff JSON" rows={7} spellCheck={false} value={source} onChange={e=>{setSource(e.target.value);setPlan(null);}}/></Field>
  <div className="button-row"><label className="json-import-label">Choose file<input type="file" aria-label="Choose Power Ops handoff file" accept=".json,application/json" onChange={e=>void file(e.target.files?.[0])}/></label><button onClick={()=>preview()}>Preview import</button></div></>}
  {plan&&<section className="handoff-preview" aria-label="Import preview">
   <p role="status">{plan.rows.length} item(s){plan.exportId?' from export '+plan.exportId:''}{plan.generatedAt?' generated '+plan.generatedAt:''}: {plan.counts.create} new, {plan.counts.update} to update, {plan.counts.unchanged} unchanged, {plan.counts.conflict} edited here, {plan.counts.skip} skipped, {plan.counts.refuse} refused.</p>
   {plan.warnings.map((w,i)=><p key={i} className="secondary">{w}</p>)}
   <div className="mini-table-scroll"><table aria-label="Handoff items"><thead><tr><th scope="col">Item</th><th scope="col">Kind</th><th scope="col">Result</th><th scope="col">Details</th></tr></thead><tbody>{plan.rows.map(r=><tr key={r.index} className={'handoff-'+r.action}><td>{r.title}<br/><small>{r.sourceObjectId??'no source ID'}</small></td><td>{r.kind??'-'}</td><td><strong>{label[r.action]}</strong>{r.action==='conflict'&&<label className="inline-check"><input type="checkbox" aria-label={'Replace AtlasNote edits for '+r.title} checked={replace.has(r.sourceObjectId!)} onChange={e=>setReplace(s=>{const n=new Set(s);if(e.target.checked)n.add(r.sourceObjectId!);else n.delete(r.sourceObjectId!);return n;})}/>Replace</label>}</td><td>{r.reason&&<small>{r.reason}</small>}{r.warnings.map((w,i)=><small key={i} className="handoff-warning">{w}</small>)}</td></tr>)}</tbody></table></div>
  </section>}
  {receipt&&<section className="handoff-receipt" role="status" aria-label="Import receipt"><p><strong>Import complete.</strong> {receipt.items.filter(i=>i.status==='created').length} created, {receipt.items.filter(i=>i.status==='updated').length} updated, {receipt.items.filter(i=>!['created','updated'].includes(i.status)).length} left unchanged or refused.</p><p className="secondary">The receipt lists source IDs and results only. Power Ops can use it to confirm which captures AtlasNote accepted.</p><div className="button-row"><button onClick={()=>void copyText(canonicalJSON(receipt)).then(()=>setCopied('Receipt copied.')).catch(()=>setCopied('Copy failed; use Download.'))}>Copy receipt</button><button onClick={()=>downloadJSON(receipt,'atlasnote-import-receipt.json')}>Download receipt</button></div>{copied&&<small>{copied}</small>}</section>}
  {error&&<p role="alert" className="error-message">{error}</p>}
  <div className="dialog-actions"><button onClick={onClose}>{receipt?'Close':'Cancel'}</button>{!receipt&&<button className="primary" disabled={!plan||busy||!writes} onClick={()=>void apply()}>{writes?'Import '+writes+' item(s)':'Nothing to import'}</button>}</div>
 </Modal>;
}

export function OverviewExportDialog({workspace,onClose}:{workspace:Workspace;onClose:()=>void}){
 const [titles,setTitles]=useState(true),[copied,setCopied]=useState(''),[generatedAt]=useState(()=>new Date().toISOString().replace(/\.\d{3}Z$/,'Z'));
 const value=useMemo(()=>planningOverview(workspace.personal,{generatedAt,today:localDateKey(),includeTitles:titles}),[workspace.personal,titles,generatedAt]),text=canonicalJSON(value);
 return <Modal wide title="Export planning overview" onClose={onClose}>
  <p className="secondary">A small, timestamped <code>{OVERVIEW_SCHEMA}</code> snapshot: counts and up to 50 open tasks with stable IDs. It never includes documents, notebook or note bodies, annotations, reading history or credentials. Nothing is sent anywhere; copy or download it yourself.</p>
  <label className="inline-check"><input type="checkbox" checked={titles} onChange={e=>setTitles(e.target.checked)}/>Include open task titles</label>
  <textarea aria-label="Planning overview JSON" readOnly rows={14} spellCheck={false} value={text}/>
  <p className="secondary">{new TextEncoder().encode(text).length.toLocaleString()} bytes · snapshot {value.sourceRevision} · generated {value.generatedAt}</p>
  {copied&&<p role="status">{copied}</p>}
  <div className="dialog-actions"><button onClick={onClose}>Close</button><button onClick={()=>downloadJSON(JSON.parse(text),'atlasnote-planning-overview.json')}>Download JSON</button><button className="primary" onClick={()=>void copyText(text).then(()=>setCopied('Planning overview copied.')).catch(()=>setCopied('Copy failed; use Download JSON.'))}>Copy JSON</button></div>
 </Modal>;
}

export function ServiceReferenceDialog({catalogue,onClose,notify}:{catalogue:any;onClose:()=>void;notify?:(m:string)=>void}){
 const [template,setTemplate]=useState('cloudflare'),[project,setProject]=useState(''),[text,setText]=useState(()=>serviceReferenceNote('cloudflare')),[taxonomy,setTaxonomy]=useState<TaxonomyRef|undefined>({subject:'cloud'}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const findings=detectSecrets(text);
 function choose(id:string,p=project){if(text!==serviceReferenceNote(template,project)&&!confirm('Replace the edited note with the new template?'))return;setTemplate(id);setProject(p);setText(serviceReferenceNote(id,p));}
 async function save(){setBusy(true);setError('');try{await store.personal(p=>captureRows(p,'note',[{text}],taxonomy));notify?.('Service reference saved to Quick notes.');onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Modal wide title="Service setup reference" onClose={onClose}>
  <p className="secondary">A knowledge note that explains which identifier is which, where to find it and where it is used. Secret values (passwords, tokens, client secrets, recovery codes) are refused: keep them in the Power Ops vault and write only the vault label here.</p>
  <div className="hub-form-grid"><Field label="Service"><select aria-label="Service template" value={template} onChange={e=>choose(e.target.value)}>{SERVICE_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></Field><Field label="Project (optional)"><input aria-label="Reference project" maxLength={80} value={project} onChange={e=>{const p=e.target.value;if(text===serviceReferenceNote(template,project))setText(serviceReferenceNote(template,p));setProject(p);}}/></Field></div>
  <Field label="Reference note"><textarea aria-label="Service reference note" rows={18} spellCheck={false} value={text} onChange={e=>setText(e.target.value)}/></Field>
  {findings.length>0&&<p role="alert" className="error-message">{secretMessage(findings)}</p>}
  <TaxonomyPicker catalogue={catalogue} overlays={store.state.overlays} value={taxonomy} onChange={setTaxonomy}/>
  {error&&<p role="alert" className="error-message">{error}</p>}
  <div className="dialog-actions"><button onClick={onClose}>Cancel</button><button className="primary" disabled={busy||findings.length>0||!text.trim()} onClick={()=>void save()}>Save reference note</button></div>
 </Modal>;
}
