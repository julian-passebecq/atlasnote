import React,{useState} from '../vendor/react.mjs';
import type {PdfMetadata} from '../core/pdf-library.js';
import {emptyPdfMetadata,prepareLocalPdf,PDF_MAX_BYTES,PDF_TARGET_BYTES} from '../core/pdf-library.js';
import {store} from '../storage/database.js';
import {compose} from '../core/workspace.js';
import {assertSafeAsset,sha256} from '../core/validation.mjs';
import {Field} from './Modal.js';
import {Icon} from './Icon.js';
import {folderOptions} from './EditDialogs.js';

export function PdfMetadataFields({value,onChange}: {value:PdfMetadata;onChange:(m:PdfMetadata)=>void}){
 const field=(key:keyof PdfMetadata,text:string)=><Field label={text}><input value={value[key]} onChange={e=>onChange({...value,[key]:e.target.value})}/></Field>;
 return <div className="pdf-metadata-fields">
  <div className="field-wide"><Field label="Document title"><input value={value.title} maxLength={240} onChange={e=>onChange({...value,title:e.target.value})}/></Field><Field label="PDF summary"><textarea rows={2} value={value.summary} onChange={e=>onChange({...value,summary:e.target.value})}/></Field></div>
  <Field label="Primary language"><select aria-label="Primary language" value={value.language} onChange={e=>onChange({...value,language:e.target.value})}><option value="">Unknown / not specified</option>{[['en','English'],['no','Norwegian'],['nb','Norwegian Bokmal'],['fr','French'],['de','German'],['es','Spanish'],['multi','Multilingual']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></Field>
  <Field label="Document type"><select aria-label="Document type" value={value.documentType} onChange={e=>onChange({...value,documentType:e.target.value})}>{['reference','cheatsheet','guide','slides','article','whitepaper','certification','diagram','other'].map(v=><option key={v}>{v}</option>)}</select></Field>
  {field('domains','Domains (comma separated)')}{field('technologies','Technologies (comma separated)')}
  <Field label="Level"><select aria-label="Level" value={value.level} onChange={e=>onChange({...value,level:e.target.value})}>{['reference','overview','fundamentals','intermediate','advanced'].map(v=><option key={v}>{v}</option>)}</select></Field>
  <Field label="Source channel"><select aria-label="Source channel" value={value.source} onChange={e=>onChange({...value,source:e.target.value})}>{['other','linkedin','vendor','web','personal'].map(v=><option key={v}>{v}</option>)}</select></Field>
  <div className="field-wide">{field('sourceUrl','Original source URL (optional)')}</div>
  {field('author','Author / creator (only if known)')}{field('publisher','Publisher / company (only if known)')}
  <div className="field-wide">{field('attribution','Attribution (optional)')}</div>
  <Field label="Rights status"><select aria-label="Rights status" value={value.rights} onChange={e=>onChange({...value,rights:e.target.value})}><option value="reference-only">Reference-only (private)</option><option value="unreviewed">Unreviewed (private)</option></select></Field>
  <Field label="Known page count (optional)"><input type="number" min="1" max="100000" value={value.pageCount} onChange={e=>onChange({...value,pageCount:e.target.value})}/></Field>
 </div>;
}
export function PdfIntake({built,catalogue:c,initialProject,initialFolder,onOpen,onClose,notify,disabled}:any){
 const [file,setFile]=useState<any>(null),[meta,setMeta]=useState(emptyPdfMetadata),[pid,setPid]=useState(initialProject??c.projects[0]?.id??''),[parent,setParent]=useState(initialFolder??''),[newFolder,setNewFolder]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[duplicate,setDuplicate]=useState<any>(null);
 async function read(file:File){setBusy(true);setError('');setDuplicate(null);setFile(null);try{if(file.size>PDF_MAX_BYTES)throw Error('PDF exceeds the unchanged 20 MiB asset limit. Prepare it offline or keep it as an external reference.');const bytes=new Uint8Array(await file.arrayBuffer());assertSafeAsset('local.pdf',bytes,'application/pdf');const hash=await sha256(bytes),found=compose(built,store.state).documents.find(d=>d.sha256===hash);if(found){setDuplicate(found);return;}setFile({bytes,hash});setMeta({...emptyPdfMetadata(),title:file.name.replace(/\.pdf$/i,'').slice(0,240)});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function commit(){setBusy(true);setError('');try{await store.flush();const result=await prepareLocalPdf(compose(built,store.state),store.state,file.bytes,meta,pid,parent,newFolder);if(result.duplicate){setDuplicate(result.duplicate);setFile(null);return;}await store.importPacks([], [result.asset!],result.overlays!);store.personal(p=>{for(const id of [pid,parent,result.parentId].filter(Boolean) as string[])if(!p.session.expanded.includes(id))p.session.expanded.push(id);});onClose();onOpen(result.page!.id);notify('Private PDF imported with its exact original bytes and one canonical tree placement.');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="settings-section pdf-intake"><h3><Icon name="pdf"/>Add a local PDF</h3><p>Private on this device. The original bytes are kept unchanged. Publicly viewable material, including LinkedIn PDFs, is not automatically redistributable.</p><label className="file-picker">Choose PDF<input aria-label="Import local PDF" type="file" accept=".pdf,application/pdf" disabled={disabled||busy} onChange={e=>{const f=e.target.files?.[0];if(f)read(f);e.target.value='';}}/></label>
  {duplicate&&<div className="pdf-duplicate" role="status"><strong>This PDF is already in your library</strong><p>{duplicate.title} has the same SHA-256. Reuse or move the existing item; no duplicate document or binary was created.</p><button onClick={()=>{onClose();onOpen(duplicate.pageId);}}>Open existing PDF</button></div>}
  {file&&<div className="import-preview"><Field label="Notebook"><select aria-label="Notebook" value={pid} onChange={e=>{setPid(e.target.value);setParent('');}}>{c.projects.map((p:any)=><option key={p.id} value={p.id}>{p.title}</option>)}</select></Field><Field label="Inside folder"><select aria-label="Inside folder" value={parent} onChange={e=>setParent(e.target.value)}><option value="">Notebook root</option>{folderOptions(c.projects.find((p:any)=>p.id===pid)).map(f=><option key={f.id} value={f.id}>{f.title}</option>)}</select></Field><Field label="New folder inside this location (optional)"><input value={newFolder} maxLength={200} onChange={e=>setNewFolder(e.target.value)}/></Field>
   <PdfMetadataFields value={meta} onChange={setMeta}/><p className="secondary">Leave unknown metadata blank. The optional page count is supplied by you, not guessed by the browser preview.</p><small>{file.bytes.length.toLocaleString()} bytes / SHA-256 {file.hash}</small>{file.bytes.length>PDF_TARGET_BYTES&&<p className="size-warning">Above the 12 MiB operational target. Consider the offline preparation utility. The 20 MiB hard limit is unchanged.</p>}
   <div className="button-row"><button onClick={()=>setFile(null)} disabled={busy}>Cancel PDF</button><button className="primary" onClick={commit} disabled={disabled||busy||!meta.title.trim()||!pid}>Import PDF locally</button></div>
  </div>}{busy&&<p role="status">Checking and saving private PDF...</p>}{error&&<p className="error-message" role="alert">{error}</p>}
 </section>;
}
