import React,{useEffect,useMemo,useRef,useState,useSyncExternalStore} from '../vendor/react.mjs';
import type {DocumentEntry,WorkspaceNumber,CompanionUI} from '../core/model.js';
import type {PdfCompanion,PdfCategory,PdfTerm} from './model.js';
import {activeSession} from '../core/workspace-slots.js';
import {store} from '../storage/database.js';
import {Icon,IconButton} from '../components/Icon.js';
import {Field,Modal} from '../components/Modal.js';
import {validateCompanion,companionKey,categoryContains,categoryFirstPage,pageTerms,pageWindow,COMPANION_LIMITS} from './validation.mjs';
import {builtinCompanion,builtinRevisionMismatch} from './sample.js';
import {companionTemplate,saveText} from './authoring.mjs';
import {sha256} from '../core/validation.mjs';

type Props={onInspectTerm?:(term:PdfTerm)=>void;managerOnly?:boolean;onClose?:()=>void;document:DocumentEntry;physicalPage:number;pageCount?:number;paneId?:string;slotId?:WorkspaceNumber;
 onNavigate:(page:number)=>void;prepare?:(first:number,last:number,progress:(n:number,last:number)=>void,signal:AbortSignal)=>Promise<any>;nativeFallback?:boolean};
function flattenCategories(categories:PdfCategory[],depth=0):{id:string;title:string;depth:number}[]{return categories.flatMap(c=>[{id:c.id,title:c.title,depth},...flattenCategories(c.children??[],depth+1)]);}
function renameCategory(categories:PdfCategory[],id:string,title:string):PdfCategory[]{return categories.map(c=>({...c,...(c.id===id?{title}:{}),...(c.children?{children:renameCategory(c.children,id,title)}:{})}));}
/** Document content is canonical, while this view's preferences are stored on
 * its original workspace/pane/revision. An inactive callback cannot write into
 * the next workspace's reader. Imported text is rendered as text, never HTML. */
export function CompanionPanel({onInspectTerm,managerOnly=false,onClose,document:original,physicalPage,pageCount,paneId,slotId=1,onNavigate,prepare,nativeFallback=false}:Props){
 const ws=useSyncExternalStore(store.subscribe,store.getSnapshot);
 const doc={...original,...(pageCount?{pageCount}:{})},key=companionKey(doc);
 const candidate:PdfCompanion|undefined=ws.overlays.companions?.[key]??builtinCompanion(doc);
 const companion=candidate&&(!doc.pageCount||candidate.pageCount===doc.pageCount)?candidate:undefined;
 const stale=builtinRevisionMismatch(doc)||!!candidate&&!companion||Object.values(ws.overlays.companions??{}).some(c=>c.documentId===doc.id&&c.documentSha256!==doc.sha256);
 const pane=(slotId===1?ws.personal.session:ws.personal.workspaceSlots?.[slotId])?.panes.find(p=>p.id===paneId),ui:CompanionUI=pane?.companionUi?.[key]??{};
 const open=ui.open??!!companion,tab=ui.tab??'overview',query=(ui.query??'').trim().toLocaleLowerCase();
 const [dialog,setDialog]=useState<'manage'|'prepare'|null>(null),[draft,setDraft]=useState<PdfCompanion|null>(null),[raw,setRaw]=useState(''),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 const [editTerm,setEditTerm]=useState(''),[editCategory,setEditCategory]=useState(''),[start,setStart]=useState(1),[end,setEnd]=useState(Math.min(doc.pageCount??1,1000));
 const [prepared,setPrepared]=useState<any>(null),[mapCursor,setMapCursor]=useState(physicalPage);
 const cancel=useRef<AbortController|null>(null),alive=useRef(true),scrollHost=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{if(!ui.term)return;const frame=requestAnimationFrame(()=>{const host=scrollHost.current,term=host?.querySelector<HTMLElement>('.companion-term');if(host&&term)host.scrollTop+=term.getBoundingClientRect().top-host.getBoundingClientRect().top-4;});return()=>cancelAnimationFrame(frame);},[ui.term]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;cancel.current?.abort();};},[]);
 useEffect(()=>{setMapCursor(physicalPage);},[physicalPage]);
 useEffect(()=>{setEnd(Math.min(doc.pageCount??1,1000));},[doc.pageCount]);
 const currentTerms=companion?pageTerms(companion,physicalPage) as PdfTerm[]:[],current=companion?.pages[String(physicalPage)];
 const selectedTerm=companion?.terms.find(t=>t.id===ui.term);
 const visibleTerms=useMemo(()=>companion?.terms.filter(t=>!query||[t.label,t.definition,t.translation,...(t.aliases??[])].join(' ').toLocaleLowerCase().includes(query))??[],[companion,query]);
 function preference(patch:Partial<CompanionUI>){
  document.dispatchEvent(new Event('atlas:before-reader-change'));
  store.personal(p=>{const target=activeSession(p,slotId).panes.find(v=>v.id===paneId);if(!target)return;target.companionUi??={};target.companionUi[key]={...target.companionUi[key],...patch};});
 }
 function jump(n:number){if(Number.isInteger(n)&&n>0&&!nativeFallback)onNavigate(n);}
 function manage(){setError('');setStatus('');setDraft(companion?structuredClone(companion):null);setRaw('');setEditTerm(companion?.terms[0]?.id??'');setEditCategory(companion?.categories[0]?.id??'');setDialog('manage');}
 async function persist(value:unknown){
  const valid=validateCompanion(value,doc) as PdfCompanion;
  const next={...store.state.overlays.companions,[key]:valid};
  if(Object.keys(next).length>500||JSON.stringify(next).length>20000000)throw Error('Companion library limit reached. Export a backup before removing old companions.');
  await store.overlays(o=>{o.companions=next;});
  return valid;
 }
 async function importValue(value:unknown){setError('');setBusy(true);try{await persist(value);if(alive.current){if(!managerOnly)preference({open:true,tab:'overview',term:''});setDialog(null);onClose?.();setStatus('Companion saved locally.');}}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current)setBusy(false);}}
 async function readFile(file:File){setError('');if(file.size>COMPANION_LIMITS.bytes){setError('Companion JSON exceeds the 2 MiB limit.');return;}try{const text=await file.text();const valid=validateCompanion(text,doc) as PdfCompanion;setDraft(valid);setRaw('');setEditTerm(valid.terms[0]?.id??'');setEditCategory(valid.categories[0]?.id??'');setStatus('Validated preview. Review the content, then save.');}catch(e){setError((e as Error).message);}}
 async function promote(term:PdfTerm){setError('');try{
  if(!companion)return;
  const hash=await sha256(new TextEncoder().encode(key+'\0'+term.id));const id='term.pdf.'+hash;
  const valid=validateCompanion({...companion,terms:companion.terms.map(t=>t.id===term.id?{...t,globalTermId:id}:t)},doc) as PdfCompanion;
  await store.overlays(o=>{o.companions??={};o.companions[key]=valid;o.glossary??=[];if(!o.glossary.some(t=>t.id===id))o.glossary.push({id,label:term.label,definition:term.definition,...(term.translation?{translation:term.translation}:{}),example:[term.example,`PDF companion: ${doc.title}. Physical pages: ${term.pageRefs.join(', ')}.`].filter(Boolean).join('\n'),pageIds:[doc.pageId],tags:['pdf-companion','document:'+doc.id],pdfRefs:[{pageId:doc.pageId,documentId:doc.id,...(doc.sha256?{revision:doc.sha256}:{}),pages:[...term.pageRefs]}]});});setStatus('Promoted to the shared glossary with physical-page backlinks.');
 }catch(e){setError((e as Error).message);}}
 async function prepareInput(){if(!prepare)return;setError('');setStatus('Extracting locally...');setBusy(true);setPrepared(null);const controller=new AbortController();cancel.current=controller;
  try{const result=await prepare(start,end,(n,last)=>{if(alive.current)setStatus(`Extracting physical page ${n} / ${last} locally...`);},controller.signal);if(alive.current){setPrepared(result);setStatus(result.selectableCharacters?`Prepared ${result.parts.length} part(s). Nothing has been uploaded.`:'No selectable text found. Manual companion JSON import is still available. No OCR was performed.');}}
  catch(e){if(alive.current)setError((e as Error).name==='AbortError'?'Extraction cancelled.':(e as Error).message);}finally{if(alive.current)setBusy(false);}
 }
 function categories(ns:PdfCategory[],depth=0):any{return ns.map(c=>{const collapsed=(ui.collapsed??[]).includes(c.id),first=categoryFirstPage(c),selected=categoryContains(c,physicalPage);return <div className={'companion-category '+(selected?'current':'')} key={c.id}>
  <div className="companion-category-row" style={{paddingLeft:depth*12}}>
   {c.children?.length?<IconButton name={collapsed?'chevron':'down'} label={(collapsed?'Expand companion category ':'Collapse companion category ')+c.title} aria-expanded={!collapsed} onClick={()=>preference({collapsed:collapsed?(ui.collapsed??[]).filter(x=>x!==c.id):[...(ui.collapsed??[]),c.id]})}/>:<span className="companion-category-indent"/>}
   <button className="text-button" disabled={!Number.isFinite(first)||nativeFallback} aria-current={selected?'location':undefined} onClick={()=>jump(first)}>{c.title}<small>{c.pageRanges?.map(([a,b])=>a===b?`p.${a}`:`p.${a}-${b}`).join(', ')||c.pageRefs?.map(n=>`p.${n}`).join(', ')}</small></button>
  </div>{c.children&&!collapsed&&categories(c.children,depth+1)}
 </div>;});}
 useEffect(()=>{if(managerOnly)manage();},[]);
 const pages=companion?pageWindow(Math.min(mapCursor,companion.pageCount),companion.pageCount):[];
 const draftTerm=draft?.terms.find(t=>t.id===editTerm),draftCategories=draft?flattenCategories(draft.categories):[],draftCategory=draftCategories.find(c=>c.id===editCategory);
 function changeTerm(patch:Partial<PdfTerm>){setDraft(d=>d?{...d,terms:d.terms.map(t=>t.id===editTerm?{...t,...patch}:t)}:d);}
 return <>{!managerOnly&&<section className={'pdf-companion '+(open?'expanded':'collapsed')} data-companion-key={key} aria-label="PDF Companion">
  <div className="companion-header"><button className="companion-toggle" aria-label={open?'Collapse PDF Companion':'Expand PDF Companion'} aria-expanded={open} onClick={()=>preference({open:!open})}><Icon name="book" size={15}/><strong>PDF Companion</strong><span>Page {physicalPage}{companion?` / ${companion.pageCount}`:''}{currentTerms.length?` / ${currentTerms.length} concepts`:''}</span><Icon name={open?'down':'chevron'} size={14}/></button>
   <IconButton name="edit" label="Manage PDF Companion" onClick={manage}/>
  </div>
  {open&&<div className="companion-expanded"><div className="companion-tabs" role="tablist" aria-label="Companion views">{(['overview','pages','glossary','search'] as const).map(t=><button key={t} role="tab" aria-selected={tab===t} className={tab===t?'selected':''} onClick={()=>preference({tab:t})}>{t==='pages'?'Page map':t[0].toUpperCase()+t.slice(1)}</button>)}<small>{companion?(companion.reviewed?'Reviewed':'AI draft / review needed'):'No companion yet'}</small></div>
   <div ref={scrollHost} className="companion-scroll" role="tabpanel" aria-label={'Companion '+tab}>
    {!companion?<div className="companion-empty"><p>{stale?'A companion exists for another PDF revision. Its page mapping is not being reused. Import a reviewed companion for the current revision.':'Add a page map and glossary to this document. Text extraction runs locally; you choose what to share with an AI.'}</p><div className="button-row"><button disabled={!prepare} onClick={()=>{setDialog('prepare');setError('');setStatus('');}}>Prepare AI companion</button><button onClick={manage}>Import companion JSON</button></div>{nativeFallback&&<small>Integrated PDF rendering is needed for physical-page synchronization and local extraction.</small>}</div>:<>
    {!doc.sha256&&<p className="companion-warning">Unversioned external PDF: its byte identity is unknown. Page mappings have not been verified against an exact file revision.</p>}
    {nativeFallback&&<p className="companion-warning">Native fallback: physical-page synchronization is unavailable. Your companion and saved position are retained.</p>}
    {tab==='overview'&&<div className="companion-overview"><div className="companion-outline" aria-label="Companion categories">{categories(companion.categories)}</div><div className="companion-current"><h3>{current?.title??`Physical page ${physicalPage}`}</h3><p>{current?.summary??'No page summary yet. The glossary and page map remain available.'}</p>{current?.keyPoints?.length? <ul>{current.keyPoints.map((s,i)=><li key={i}>{s}</li>)}</ul>:null}<div className="companion-chips" aria-label="Current page concepts">{currentTerms.slice(0,80).map(t=><button key={t.id} aria-pressed={ui.term===t.id} className={ui.term===t.id?'selected':''} onClick={()=>preference({term:t.id})}>{t.label}</button>)}</div></div></div>}
    {tab==='pages'&&<><div className="companion-page-navigation"><button disabled={pages[0]<=1} onClick={()=>setMapCursor(Math.max(1,mapCursor-40))}>Previous 40</button><span>Physical pages {pages[0]}-{pages.at(-1)} / {companion.pageCount}</span><button disabled={pages.at(-1)!>=companion.pageCount} onClick={()=>setMapCursor(Math.min(companion.pageCount,mapCursor+40))}>Next 40</button></div><div className="companion-page-map">{pages.map(n=><button key={n} disabled={nativeFallback} aria-current={n===physicalPage?'page':undefined} className={n===physicalPage?'selected':''} onClick={()=>jump(n)}><strong>{n}</strong><span>{companion.pages[String(n)]?.title??`Page ${n}`}</span></button>)}</div></>}
    {(tab==='glossary'||tab==='search')&&<><label className="companion-search"><Icon name="search" size={14}/><input aria-label="Search this PDF companion" value={ui.query??''} maxLength={300} placeholder="Search this document's concepts..." onChange={e=>preference({query:e.target.value})}/></label>
      <div className="companion-glossary">{visibleTerms.slice(0,60).map(t=><button key={t.id} aria-pressed={ui.term===t.id} onClick={()=>preference({term:t.id})}><strong>{t.label}</strong><small>{t.translation||t.importance||`p.${t.pageRefs.join(', ')}`}</small></button>)}</div>{visibleTerms.length>60&&<small>Showing 60 of {visibleTerms.length}. Refine the search.</small>}{tab==='search'&&query&&<div className="companion-page-map">{Object.values(companion.pages).filter(p=>[p.title,p.summary,...(p.keyPoints??[])].join(' ').toLocaleLowerCase().includes(query)).slice(0,40).map(p=><button key={p.page} disabled={nativeFallback} onClick={()=>jump(p.page)}><strong>{p.page}</strong>{p.title??'Page '+p.page}</button>)}</div>}
    </>}
    {selectedTerm&&<article className="companion-term" aria-label={'Definition of '+selectedTerm.label}><div className="companion-term-title"><strong>{selectedTerm.label}</strong>{selectedTerm.translation&&<small>{selectedTerm.translation}</small>}<IconButton name="close" label="Close concept definition" onClick={()=>preference({term:''})}/></div><p>{selectedTerm.definition}</p>{selectedTerm.example&&<p className="secondary">{selectedTerm.example}</p>}<div className="companion-occurrences"><span>Physical pages:</span>{selectedTerm.pageRefs.map(n=><button key={n} disabled={nativeFallback} aria-label={'Go to PDF page '+n} onClick={()=>jump(n)}>p.{n}</button>)}<button disabled={!!selectedTerm.globalTermId&&!!ws.overlays.glossary?.some(t=>t.id===selectedTerm.globalTermId)} onClick={()=>void promote(selectedTerm)}>{selectedTerm.globalTermId&&ws.overlays.glossary?.some(t=>t.id===selectedTerm.globalTermId)?'In global glossary':'Promote to global glossary'}</button></div></article>}
    </>}
   </div>
  </div>}
 </section>}
 {dialog&&<Modal title={dialog==='manage'?'Manage PDF Companion':'Prepare AI companion'} wide onClose={()=>{cancel.current?.abort();setDialog(null);onClose?.();}}>
  <p className="secondary">{doc.title} / {doc.pageCount??'Unknown'} physical pages</p><code className="companion-revision">{doc.id} / {doc.sha256??'Unversioned external reference'}</code>
  {dialog==='prepare'?<><p>Extract selectable text locally. AtlasNote does not send your PDF to an AI service. Review the exported text before sharing it. Your companion JSON can be imported here afterwards.</p><div className="companion-range"><Field label="First physical page"><input aria-label="First physical page" type="number" min={1} max={doc.pageCount} value={start} onChange={e=>setStart(Number(e.target.value))}/></Field><Field label="Last physical page (max 1,000 per batch)"><input aria-label="Last physical page (max 1,000 per batch)" type="number" min={start} max={doc.pageCount} value={end} onChange={e=>setEnd(Number(e.target.value))}/></Field></div><div className="button-row"><button className="primary" disabled={!prepare||busy} onClick={()=>void prepareInput()}>Extract locally</button>{busy&&<button onClick={()=>cancel.current?.abort()}>Cancel extraction</button>}</div>
   {prepared&&<><p>{prepared.coverage.first}-{prepared.coverage.last} of {prepared.coverage.documentPages} physical pages. Each part records missing text and any truncation.</p>{prepared.parts.map((part:any,i:number)=><div className="button-row" key={i}><button onClick={()=>saveText(`atlas-companion-input-${i+1}.json`,JSON.stringify(part,null,2))}>Download AI input part {i+1}</button><button onClick={()=>{navigator.clipboard.writeText(JSON.stringify(part,null,2)).then(()=>setStatus('Input copied. Nothing was uploaded.')).catch(()=>setError('Clipboard unavailable. Use the download button.'));}}>Copy part {i+1}</button></div>)}</>}
  </>:<>
   <div className="button-row"><label className="file-picker">Import companion JSON<input aria-label="Import companion JSON" type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)void readFile(f);e.target.value='';}}/></label><button disabled={!prepare} onClick={()=>{setDialog('prepare');setError('');setStatus('');}}>Prepare AI companion</button><button disabled={!doc.pageCount} onClick={()=>saveText('companion-template.json',JSON.stringify(companionTemplate(doc,doc.pageCount??1),null,2))}>Download template</button>{companion&&<button onClick={()=>saveText('pdf-companion.json',JSON.stringify(companion,null,2))}>Export companion</button>}</div>
   <details className="companion-json"><summary>Paste or edit complete JSON</summary><textarea aria-label="Companion JSON" rows={8} maxLength={COMPANION_LIMITS.bytes} value={raw} onChange={e=>setRaw(e.target.value)} placeholder="Paste AI companion JSON here"/><div className="button-row"><button disabled={!raw||busy} onClick={()=>{try{const valid=validateCompanion(raw,doc) as PdfCompanion;setDraft(valid);setEditTerm(valid.terms[0]?.id??'');setEditCategory(valid.categories[0]?.id??'');setStatus('Validated preview ready.');setError('');}catch(e){setError((e as Error).message);}}}>Validate preview</button>{draft&&<button onClick={()=>setRaw(JSON.stringify(draft,null,2))}>Load preview into JSON editor</button>}</div></details>
   {draft&&<div className="companion-edit"><h3>Review and correct</h3><p>{draft.terms.length} terms / {Object.keys(draft.pages).length} page summaries. Saving changes study metadata only, never the original PDF.</p><Field label="Edit concept"><select aria-label="Edit concept" value={editTerm} onChange={e=>setEditTerm(e.target.value)}>{draft.terms.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></Field>
    {draftTerm&&<>{onInspectTerm&&<button disabled={JSON.stringify(draft)!==JSON.stringify(companion)} title="Save edits first to inspect the saved definition and its physical page links" onClick={()=>{const saved=companion?.terms.find(t=>t.id===editTerm);if(saved)onInspectTerm(saved);}}>Open saved definition</button>}<Field label="Concept label"><input aria-label="Concept label" maxLength={240} value={draftTerm.label} onChange={e=>changeTerm({label:e.target.value})}/></Field><Field label="Concept definition"><textarea aria-label="Concept definition" rows={3} maxLength={10000} value={draftTerm.definition} onChange={e=>changeTerm({definition:e.target.value})}/></Field><Field label="Concept translation"><input aria-label="Concept translation" value={draftTerm.translation??''} onChange={e=>changeTerm({translation:e.target.value})}/></Field><Field label="Page occurrences (comma separated)"><input aria-label="Page occurrences (comma separated)" key={editTerm+draft.id} defaultValue={draftTerm.pageRefs.join(', ')} onChange={e=>changeTerm({pageRefs:e.target.value.trim()?e.target.value.split(',').map(n=>Number(n.trim())):[]})}/></Field><Field label="Concept categories"><select aria-label="Concept categories" multiple value={draftTerm.categoryIds??[]} onChange={e=>changeTerm({categoryIds:[...e.target.selectedOptions].map(o=>o.value)})}>{draftCategories.map(c=><option key={c.id} value={c.id}>{' / '.repeat(c.depth)+c.title}</option>)}</select></Field></>}
    <Field label="Edit category"><select aria-label="Edit category" value={editCategory} onChange={e=>setEditCategory(e.target.value)}>{draftCategories.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></Field>{draftCategory&&<Field label="Category title"><input aria-label="Category title" maxLength={240} value={draftCategory.title} onChange={e=>setDraft({...draft,categories:renameCategory(draft.categories,editCategory,e.target.value)})}/></Field>}
    <label className="inline-check"><input type="checkbox" checked={draft.reviewed??false} onChange={e=>setDraft({...draft,reviewed:e.target.checked})}/>I reviewed these page mappings and definitions</label><div className="dialog-actions"><button className="primary" disabled={busy} onClick={()=>void importValue(draft)}>Save companion locally</button></div>
   </div>}
  </>}
  {status&&<p role="status" className="success-message">{status}</p>}{error&&<p role="alert" className="error-message">{error}</p>}
 </Modal>}
 {!dialog&&error&&<div className="companion-inline-error" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}
 </>;
}
