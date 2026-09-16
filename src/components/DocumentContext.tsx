import {ReferenceContext} from '../references/ReferenceUI.js';
import {currentResourceTarget} from '../content-hub/content.js';
import {ResourcePicker,ResourceLink} from '../content-hub/ResourcePicker.js';
import {addRelatedTarget} from '../content-hub/content.js';
import {targetForPage} from '../core/reading-lists.js';
import type {ReadingTarget} from '../core/reading-types.js';
import {cheatsheetOutline} from '../cheatsheets/text-layout.mjs';
import {sheetPosition} from '../cheatsheets/content.mjs';
import React,{useState,useMemo,useEffect,useRef} from '../vendor/react.mjs';
import {Icon,IconButton} from './Icon.js';
import {TermCard} from './SearchContext.js';
import {PdfStudyTree} from '../companion/PdfStudyTree.js';
import {resolveStudy,categoryPageRows} from '../companion/tree.js';
import {walkBlocks,pageLinks} from '../core/validation.mjs';
import {makeRemark,pdfAnchor} from '../core/personal-state.js';
import {documentBlockMatches,relatedPageOverlay} from '../core/document-context.js';
import {searchOpenPdf} from '../pdf/text-search.js';
import type {PdfTextResult} from '../pdf/text-search.js';
import {store} from '../storage/database.js';
const tabs=[['outline','Outline / Glossary'],['search','Search'],['remarks','Remarks'],['related','Related'],['references','References'],['history','History']] as const;
const time=(n?:number)=>n?new Date(n).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Not recorded';
const reflection='What pattern did I recognize?\nWhere did I get stuck?\nWas it syntax, grain, windows, decomposition or architecture?\nDid I rewrite my first approach?\nWhat interviewer signal did I miss?\n';
export function ContextPanel({references,catalogue:c,page,location,workspace:ws,paneId,onTarget,onOpen,onJump,onClose,notify,onPdfNavigate,onPdfToggle,onPdfManage,onReadingActions}:any){
 const [tab,setTab]=useState('outline'),[query,setQuery]=useState(''),[linkQuery,setLinkQuery]=useState(''),[linkId,setLinkId]=useState(''),[linkBusy,setLinkBusy]=useState(false);
 const [typedTarget,setTypedTarget]=useState<ReadingTarget|undefined>(undefined),[typedLabel,setTypedLabel]=useState('');
 const [pdfResult,setPdfResult]=useState<PdfTextResult|null>(null),[searchStatus,setSearchStatus]=useState('');
 const searchJob=useRef<AbortController|null>(null);
 // Keep the chosen task (for example Remarks) while switching documents. Reset
 // only document-specific search/link drafts and cancel the old PDF search.
 useEffect(()=>{searchJob.current?.abort();setQuery('');setLinkQuery('');setLinkId('');setPdfResult(null);setSearchStatus('');return()=>searchJob.current?.abort();},[page?.id,paneId]);
 const doc=c.documents.find((d:any)=>d.pageId===page?.id),physical=doc&&(location?.anchor?.pdfPage??location?.pdfPage);
 const sheet=page?.cheatsheet,sheetPage=sheet?sheetPosition(sheet,location).page:undefined,sheetId=sheet?.pages[(sheetPage??1)-1]?.id;
 const remarkKey=sheetId?`${page.id}::sheet:${sheetId}`:page?physical?`${page.id}::pdf:${physical}@${doc.sha256??'external'}`:doc?`${page.id}::document@${doc.sha256??'external'}`:page.id:'';
 const terms=useMemo(()=>c.glossary.filter((t:any)=>page?.terms.includes(t.id)||t.pageIds.includes(page?.id)),[c,page]);
 const outline:any[]=page?.qcm?page.qcm.questions.map((q,i)=>({id:q.id,title:(i+1)+'. '+q.prompt,depth:0})):sheet?cheatsheetOutline(sheet).map(a=>({id:a.id,title:(a.depth===0?'p.'+a.sheetPage+' - ':'')+a.label,depth:a.depth})):[];if(page&&!sheet)walkBlocks(page.blocks,(b:any,parents:any)=>{if(b.type==='section')outline.push({id:b.id,title:b.title,depth:parents.length});});
 const backlinks=useMemo(()=>page?c.pages.filter((p:any)=>p.id!==page.id&&pageLinks(p).includes(page.id)):[],[c,page]);
 const oldNotes=doc?Object.entries(ws.personal.notes).filter(([key,n]:any)=>n.pageId===page?.id&&n.revision&&n.revision!==doc.sha256):[];
 const note=ws.personal.notes[remarkKey],interview=page?.tags.includes('interview');
 const blockHits=useMemo(()=>page&&!doc?documentBlockMatches(page,query):[],[page,doc,query]);
 const pageHits=useMemo(()=>{if(!doc||!query.trim())return [];const companion=resolveStudy(doc,ws).companion;if(!companion)return [];const needle=query.toLocaleLowerCase();return companion.categories.flatMap(category=>categoryPageRows(category,companion).filter(row=>(category.title+' '+row.title).toLocaleLowerCase().includes(needle)).map(row=>({...row,id:category.id+row.id}))).slice(0,80);},[doc,ws.overlays.companions,query]);
 const matchingTerms=terms.filter((t:any)=>(t.label+' '+t.definition).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const visit=ws.personal.documentVisits?.find((v:any)=>v.pageId===page?.id);
 function saveRemark(text:string){if(!page)return;void store.personal(p=>{p.notes[remarkKey]=makeRemark(text,page.id,Date.now(),doc?.sha256,physical?pdfAnchor(physical,doc?.sha256):sheetId?{sheetPage,sheetId}:undefined);}).catch(()=>{});}
 async function findPdf(){
  searchJob.current?.abort();const job=new AbortController();searchJob.current=job;setPdfResult(null);setSearchStatus('Searching this PDF...');
  try{const result=await searchOpenPdf(ws.personal.activeWorkspaceSlot??1,paneId,doc.id,query,job.signal);if(job.signal.aborted)return;setPdfResult(result);setSearchStatus(result.hasText?`${result.hits.length} matching physical pages. Searched ${result.searched} / ${result.total} pages.`:'No selectable text found. This may be an image-only PDF; OCR is not included.');}
  catch(e){if(!job.signal.aborted)setSearchStatus((e as Error).message);}
 }
 async function link(target:string,remove=false){setLinkBusy(true);try{const entry=await relatedPageOverlay(c,store.state.overlays,page.id,target,remove);await store.overlays(o=>{o.pages[page.id]=entry;});setLinkId('');notify(remove?'Relationship removed. Source documents are unchanged.':'Related document linked locally.');}catch(e){notify((e as Error).message,true);}finally{setLinkBusy(false);}}
 function jumpTarget(id:string){if(page?.qcm)onTarget({kind:'qcm',setId:page.qcm.id,pageId:page.id,questionId:id});else onJump(id);}
 async function typedLink(removeIndex?:number){try{if(typedTarget||removeIndex!==undefined){await store.overlays(o=>addRelatedTarget(o,c,page.id,typedLabel,typedTarget??{kind:'page',pageId:page.id},removeIndex));notify('Typed relationship updated. Source targets are unchanged.');}}catch(e){notify((e as Error).message,true);}}
 function tabKey(e:any,index:number){if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;setTab(tabs[next][0]);const list=e.currentTarget.parentElement as HTMLElement;requestAnimationFrame(()=>list.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());}
 return <aside className="context-panel document-context" aria-label="Active document context">
  <div className="context-heading"><strong title={page?.title}>{page?.title??'Active document'}</strong><IconButton name="context" label="Collapse context panel" onClick={onClose}/></div>
  <div className="context-tabs" role="tablist" aria-label="Document context sections">{tabs.map(([id,label],i)=><button key={id} id={'context-tab-'+id} role="tab" aria-selected={tab===id} aria-controls={'context-body-'+id} tabIndex={tab===id?0:-1} className={tab===id?'selected':''} onClick={()=>setTab(id)} onKeyDown={e=>tabKey(e,i)}>{label}</button>)}</div>
  {tab==='references'&&references?<div className="context-scroll" id="context-body-references" role="tabpanel" aria-labelledby="context-tab-references"><ReferenceContext {...references} target={currentResourceTarget(c,location)}/></div>:page?<div className="context-scroll" id={'context-body-'+tab} role="tabpanel" aria-labelledby={'context-tab-'+tab}>
   {tab==='outline'&&<>
    {doc?<PdfStudyTree doc={doc} workspace={ws} depth={0} onToggle={onPdfToggle} onNavigate={onPdfNavigate} onManage={onPdfManage} onActions={onReadingActions}/>:<>
     {outline.map(x=><button key={x.id} className="outline-link" style={{paddingLeft:8+x.depth*10}} onClick={()=>jumpTarget(x.id)}>{x.title}</button>)}
     {!outline.length&&<p className="context-empty">No section headings in this note.</p>}
    </>}
    <h3 className="context-section-label">Glossary <span>{terms.length}</span></h3>
    {terms.length?terms.slice(0,40).map((t:any)=><TermCard key={t.id} term={t} catalogue={c} onOpen={onOpen}/>):<p className="context-empty">No glossary entries linked to this document.</p>}
    {terms.length>40&&<p className="context-empty">Showing 40 entries. Use document Search to narrow this glossary.</p>}
   </>}
   {tab==='search'&&<>
    <form className="document-search-form" onSubmit={e=>{e.preventDefault();if(doc&&query.trim())void findPdf();}}>
     <label>Search this document<input aria-label="Search this document" value={query} placeholder={doc?'Category, heading or PDF text...':'Text, code or section heading...'} onChange={e=>{searchJob.current?.abort();setQuery(e.target.value);setPdfResult(null);setSearchStatus('');}}/></label>
     {doc&&<button disabled={!query.trim()} type="submit">Search selectable PDF text</button>}
    </form>
    {query.trim()&&<>
     {blockHits.map(hit=><button key={hit.id} className="document-search-hit" onClick={()=>jumpTarget(hit.id)}><strong>{hit.title}</strong><span>{hit.excerpt}</span></button>)}
     {pageHits.map(hit=><button key={hit.id} className="document-search-hit" onClick={()=>onPdfNavigate(doc.pageId,hit.page)}><strong>{hit.title} <small>p.{hit.page}</small></strong></button>)}
     {matchingTerms.slice(0,40).map((t:any)=><TermCard key={t.id} term={t} catalogue={c} onOpen={onOpen}/>)}
     {!blockHits.length&&!pageHits.length&&!matchingTerms.length&&<p className="context-empty">No matching note, page heading or glossary entry in this document.</p>}
    </>}
    {searchStatus&&<p role="status" className="context-empty">{searchStatus}</p>}
    {pdfResult?.hits.map(hit=><button key={hit.page} className="document-search-hit" onClick={()=>onPdfNavigate(doc.pageId,hit.page)}><strong>Physical page {hit.page}</strong><span>{hit.excerpt}</span></button>)}
    {!query&&<p className="context-empty">Only this document and its linked glossary are searched. Global search is in the top-left navigation.</p>}
   </>}
   {tab==='remarks'&&<>
    <div className="remarks-target"><Icon name="lock" size={15}/><strong>{interview?'Interview reflection':page.title}</strong>{sheet&&<small>Physical cheatsheet page {sheetPage}</small>}{doc&&<small>{physical?'Physical PDF page '+physical:'Document-level remark; no physical page selected.'}</small>}</div>
    {interview&&<button className="reflection-prompts" onClick={()=>saveRemark((note?.text?note.text+'\n\n':'')+reflection)}>Insert reflection prompts</button>}
    <textarea className="remarks-input" aria-label="Personal remarks" placeholder={interview?'What pattern did you recognize? Where did you get stuck?':'Your understanding, a question to revisit, a connection to another idea...'} value={note?.text??''} onChange={e=>saveRemark(e.target.value)}/>
    <div className="autosave-status">{store.error?'Storage needs attention':store.saving?'Saving locally...':'Saved locally'}<span>{(note?.text??'').length} characters</span></div>
    <p className="context-empty">Remarks are separate from the source page. They are excluded from AI export and print unless you explicitly include them.</p>
    {oldNotes.length>0&&<details className="revision-warning"><summary>Remarks on another PDF revision ({oldNotes.length})</summary><p>The document hash changed. These notes have not been silently reassigned to different physical pages.</p>{oldNotes.map(([key,n]:any)=><article key={key}><code>{n.revision.slice(0,12)}</code><p>{n.text}</p><button onClick={()=>{saveRemark(n.text);notify('Old remark copied to the current revision.');}}>Copy to current revision</button></article>)}</details>}
   </>}
   {tab==='related'&&<>
    <p className="context-empty">Link notebooks, interviews, PDFs and cheatsheets. These are explicit local links, not recommendations.</p>
    {page.related.map((id:string)=><div className="related-document-row" key={id}><button className="context-link" onClick={()=>onTarget(targetForPage(c,id))}><Icon name={c.documents.some((d:any)=>d.pageId===id)?'pdf':'page'} size={15}/><span>{c.pages.find((p:any)=>p.id===id)?.title??id}</span></button><IconButton name="close" label={'Remove relationship to '+(c.pages.find((p:any)=>p.id===id)?.title??id)} disabled={linkBusy} onClick={()=>void link(id,true)}/></div>)}
    {!page.related.length&&!page.resourceLinks?.length&&<p className="context-empty">No explicit related documents.</p>}
    <form className="related-document-form" onSubmit={e=>{e.preventDefault();if(linkId)void link(linkId);}}>
     <label>Find a document<input aria-label="Filter related documents" value={linkQuery} onChange={e=>{setLinkQuery(e.target.value);setLinkId('');}}/></label>
     <label>Related document<select aria-label="Related document" value={linkId} onChange={e=>setLinkId(e.target.value)}><option value="">Choose a document</option>{c.pages.filter((p:any)=>p.id!==page.id&&!page.related.includes(p.id)&&p.title.toLocaleLowerCase().includes(linkQuery.toLocaleLowerCase())).slice(0,80).map((p:any)=><option key={p.id} value={p.id}>{c.documents.some((d:any)=>d.pageId===p.id)?'PDF: ':p.cheatsheet?'Cheatsheet: ':'Note: '}{p.title}</option>)}</select></label>
     <button disabled={!linkId||linkBusy}>Link document</button>
    </form>
    {page.resourceLinks?.map((l,i)=><div className="related-typed-link" key={i}><ResourceLink target={l.target} label={l.label} onOpen={onTarget}/><button aria-label={'Actions for related '+l.label} onClick={e=>onReadingActions(l.target,l.label,e)}>Actions</button><button aria-label={'Remove typed relationship '+l.label} onClick={()=>void typedLink(i)}>Remove link</button></div>)}
    {page.article?.contextTarget&&<div className="related-typed-link"><ResourceLink target={page.article.contextTarget} label="Captured reading context" onOpen={onTarget}/></div>}
    <details><summary>Link an exact resource position</summary><ResourcePicker catalogue={c} workspace={ws} onChange={(t,label)=>{setTypedTarget(t);setTypedLabel(label.slice(0,160));}}/><label>Link label<input aria-label="Related typed link label" value={typedLabel} maxLength={160} onChange={e=>setTypedLabel(e.target.value)}/></label><button disabled={!typedTarget||!typedLabel.trim()} onClick={()=>void typedLink()}>Add typed relationship</button></details>
    {!!backlinks.length&&<><h3 className="context-section-label">Linked from</h3>{backlinks.map((p:any)=><button className="context-link" key={p.id} onClick={()=>onOpen(p.id)}><Icon name="link" size={15}/><span>{p.title}</span></button>)}</>}
   </>}
   {tab==='history'&&<>
    <dl className="document-history"><dt>First opened on this device</dt><dd>{time(visit?.firstOpenedAt)}</dd><dt>Last opened</dt><dd>{time(visit?.lastOpenedAt)}</dd><dt>Added date / source modification</dt><dd>{page.article?time(page.article.addedAt)+' / '+time(page.article.updatedAt):'Not recorded by this source.'}</dd>{note&&<><dt>Last remark edit</dt><dd>{time(note.updatedAt)}</dd></>}</dl>
    <h3 className="context-section-label">Recent document visits</h3>
    {(ws.personal.documentVisits??[]).slice(0,12).map((v:any)=>{const p=c.pages.find((p:any)=>p.id===v.pageId);return <button className="document-search-hit" key={v.pageId} disabled={!p} onClick={()=>onOpen(v.pageId)}><strong>{p?.title??v.pageId}</strong><small>{time(v.lastOpenedAt)}</small></button>;})}
    <p className="context-empty">At most 50 document timestamps stay on this device and in your backup. No analytics or remote activity tracking.</p>
   </>}
  </div>:<div className="empty-context"><Icon name="book" size={30}/><h3>Open a document</h3><p>Its outline, search, remarks, relationships and recent visits will appear here. Workspace States has its own button.</p></div>}
 </aside>;
}
