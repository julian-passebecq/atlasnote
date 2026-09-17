import React,{useState,useMemo,useEffect,useRef} from '../vendor/react.mjs';
import type {Catalogue,Workspace} from '../core/model.js';
import type {ResourceTarget,ReadingDestination} from '../core/reading-types.js';
import type {ReferenceExplorerState} from './model.js';
import {Icon,IconButton} from '../components/Icon.js';
import {createReferenceIndex,queryReferences,reviewQueue} from './knowledge.js';
import type {ReferenceIndex,ReferenceRow} from './knowledge.js';
import {targetKey,resolveTarget} from './targets.js';
import {SUBJECTS} from '../content-hub/model.js';
import {targetTaxonomy,taxonomyLabel} from '../content-hub/taxonomy.js';
export type ReferenceProps={catalogue:Catalogue;workspace:Workspace;target?:ResourceTarget;index:ReferenceIndex;onOpen:(target:ResourceTarget,where?:ReadingDestination)=>void;onActions:(target:ResourceTarget,title:string,event:any)=>void;onManage:(target?:ResourceTarget)=>void;onExplore:(target?:ResourceTarget,conceptId?:string)=>void};
export function ReferenceRowView({row,onOpen,onActions}:{row:ReferenceRow;onOpen:ReferenceProps['onOpen'];onActions:ReferenceProps['onActions']}){
 // Native click + dblclick would replace the source before opening its new tab.
 // Delay only the ordinary pointer click; keyboard/modified clicks are immediate.
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 const cancel=()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}};
 const open=(where:ReadingDestination='here')=>{if(row.available)onOpen(row.target,where);};
 return <div className="reference-result" data-reference-key={row.key} data-reference-group={row.group}>
  <button className="reference-open" disabled={!row.available} title={[row.title,row.detail,...row.reasons].join(' / ')} onClick={e=>{cancel();if(e.ctrlKey||e.metaKey||e.detail===0)open(e.ctrlKey||e.metaKey?'tab':'here');else timer.current=setTimeout(()=>open(),260);}} onDoubleClick={e=>{e.preventDefault();cancel();open('tab');}} onMouseDown={e=>{if(e.button===1)e.preventDefault();}} onAuxClick={e=>{if(e.button===1){e.preventDefault();cancel();open('tab');}}}>
   <span className="reference-type">{row.group}</span><strong>{row.title}</strong>{row.detail&&<small>{row.detail}</small>}<small className="reference-reasons">{row.reasons.join(' / ')}</small>
   {row.warning&&<small className="reference-warning">{row.warning}</small>}{row.stale&&<small className="reference-warning">Content changed since linking; review the reference.</small>}
  </button>
  <IconButton name="more" label={'Reference actions for '+row.title+(row.detail?' / '+row.detail:'')} onClick={e=>{cancel();onActions(row.target,row.title,e);}}/>
 </div>;
}
export function ReferenceResults({rows,total,onOpen,onActions,compact=false}:{rows:ReferenceRow[];total:number;onOpen:ReferenceProps['onOpen'];onActions:ReferenceProps['onActions'];compact?:boolean}){
 const [limit,setLimit]=useState(compact?12:30);const shown=rows.slice(0,limit),groups=[...new Set(shown.map(r=>r.group))];
 return <div className="reference-results">{groups.map(group=><section className="reference-group" key={group}><h4>{group}</h4>{shown.filter(r=>r.group===group).map(r=><ReferenceRowView key={r.key} row={r} onOpen={onOpen} onActions={onActions}/>)}</section>)}{!total&&<p className="reference-empty">No references at this scope yet. Link a concept or add an exact reference.</p>}{rows.length>limit&&<button className="text-button" onClick={()=>setLimit(x=>Math.min(200,x+30))}>Show more references ({rows.length-limit})</button>}{total>rows.length&&<p className="secondary">Showing {rows.length} of {total}; narrow the concept or resource scope.</p>}</div>;
}
export function ReferenceContext(props:ReferenceProps){
 const {catalogue:c,workspace:ws,target,index,onManage,onExplore}=props;
 const query=useMemo(()=>queryReferences(c,ws,index,target),[c,ws.overlays,index,target?targetKey(c,target):'']);
 const r=target?resolveTarget(c,ws,target):undefined,tax=target?targetTaxonomy(c,ws,target):undefined;
 return <div className="reference-context" aria-label="Exact references">
  <div className="reference-scope"><small>CURRENT SCOPE</small><strong>{r?.title??'Knowledge index'}</strong><span>{r?.detail||'Document-wide'}</span>{tax&&<small>{taxonomyLabel(tax,c,ws.overlays)}</small>}</div>
  <h3>Concepts</h3><div className="concept-chips">{query.concepts.map(concept=><button key={concept.id} onClick={()=>onExplore(target,concept.id)}>{concept.label}{concept.deprecated?' (deprecated)':''}</button>)}{!query.concepts.length&&<span className="secondary">No concept assigned at this scope.</span>}</div>
  <div className="reference-commands"><button onClick={()=>onManage(target)}>Link concept / Add reference</button><button onClick={()=>onExplore(target)}>Open Reference Explorer</button></div>
  {(['outgoing','incoming','related'] as const).map(direction=>{const rows=query.rows.filter(r=>r.directions.includes(direction));return <section key={direction} className="reference-direction"><h3>{direction==='outgoing'?'References from here':direction==='incoming'?'Referenced by / Backlinks':'Related by concept'} <small>{rows.length}</small></h3><ReferenceResults compact rows={rows} total={rows.length} onOpen={props.onOpen} onActions={props.onActions}/></section>;})}
 </div>;
}
export function ReferenceLens(props:ReferenceProps){
 const [open,setOpen]=useState(false),{target,index,catalogue:c,workspace:ws}=props;
 const query=useMemo(()=>open?queryReferences(c,ws,index,target):null,[open,c,index,target?targetKey(c,target):'']);
 return <div className="reference-lens" data-virtual-reference="true"><button className="reference-lens-toggle" aria-expanded={open} aria-label={'References for '+(target?resolveTarget(c,ws,target).title:'folder')} onClick={()=>setOpen(!open)}><Icon name={open?'down':'chevron'} size={12}/>References <small>linked, not filed</small></button>{open&&query&&<div className="reference-lens-body"><ReferenceResults compact rows={query.rows} total={query.total} onOpen={props.onOpen} onActions={props.onActions}/><div className="reference-commands"><button onClick={()=>props.onManage(target)}>Link concept</button><button onClick={()=>props.onExplore(target)}>Explore all</button></div></div>}</div>;
}
export function ReferenceExplorer(props:ReferenceProps&{state:ReferenceExplorerState;onState:(value:ReferenceExplorerState)=>void;onClose:()=>void}){
 const {catalogue:c,workspace:ws,index,state,onState}=props,[text,setText]=useState(''),[type,setType]=useState('All'),[direction,setDirection]=useState('all'),[queue,setQueue]=useState(false),[resourceLimit,setResourceLimit]=useState(30);
 const selected=state.target,concept=state.conceptId?index.knowledge.concepts.find(c=>c.id===state.conceptId):undefined;
 const query=useMemo(()=>queryReferences(c,ws,index,selected,state.conceptId),[c,index,selected?targetKey(c,selected):'',state.conceptId]);
 const pending=useMemo(()=>reviewQueue(c,ws,index),[c,index]);
 const rows=query.rows.filter(r=>(type==='All'||r.group===type)&&(direction==='all'||r.directions.includes(direction as any))&&(!text||(r.title+' '+r.detail+' '+r.reasons.join(' ')).toLocaleLowerCase().includes(text.toLocaleLowerCase())));
 function conceptTree(parent:string):any {return index.knowledge.concepts.filter(c=>c.primaryParentId===parent).map(c=>{const children=index.knowledge.concepts.some(x=>x.primaryParentId===c.id);return <div key={c.id} className="concept-index-node">{children?<details open><summary><button className={concept?.id===c.id?'selected':''} onClick={()=>{setQueue(false);onState({...state,conceptId:c.id});}}>{c.label}{c.deprecated?' (deprecated)':''}</button></summary>{conceptTree(c.id)}</details>:<button className={concept?.id===c.id?'selected':''} onClick={()=>{setQueue(false);onState({...state,conceptId:c.id});}}>{c.label}{c.deprecated?' (deprecated)':''}</button>}</div>;});}
 return <main className="reference-explorer" aria-label="Reference Explorer"><header><div><small>KNOWLEDGE NAVIGATION</small><h1>Reference Explorer</h1><p>Your Notebook arrangement stays independent.</p></div><IconButton name="close" label="Close Reference Explorer" onClick={props.onClose}/></header>
 <div className="reference-explorer-layout"><nav className="concept-index" aria-label="Concept Index"><button onClick={()=>{setQueue(false);const {conceptId,...rest}=state;onState(rest);}}>Current resource references</button><button aria-pressed={queue} onClick={()=>setQueue(!queue)}>Unlinked / Needs review ({pending.length})</button><button onClick={()=>props.onManage(selected)}>Manage concepts &amp; review</button>
 {SUBJECTS.map(subject=><details key={subject.id} open><summary>{subject.label}</summary>{index.knowledge.concepts.filter(c=>c.subject===subject.id&&!c.primaryParentId).map(root=><div key={root.id}><button className={concept?.id===root.id?'selected':''} onClick={()=>{setQueue(false);onState({...state,conceptId:root.id});}}>{root.label}</button>{conceptTree(root.id)}</div>)}</details>)}
 </nav><section className="reference-explorer-main">
 {queue?<><h2>Needs reference review</h2><p>Exact targets without reviewed links, or content changed since review. Nothing is linked automatically.</p><input aria-label="Filter review queue" value={text} onChange={e=>setText(e.target.value)} placeholder="Filter resources"/>{pending.filter(r=>(r.title+' '+r.detail).toLocaleLowerCase().includes(text.toLocaleLowerCase())).slice(0,resourceLimit).map(r=><div className="review-queue-row" key={r.key}><button onClick={()=>{setQueue(false);onState({target:r.target,...(state.returnViewId?{returnViewId:state.returnViewId}:{})});}}><strong>{r.title}</strong><small>{r.group} / {r.detail||'Document'} / {r.status}</small></button><button onClick={()=>props.onManage(r.target)}>Review links</button></div>)}{pending.length>resourceLimit&&<button onClick={()=>setResourceLimit(x=>x+30)}>Show more review items</button>}</>:<><h2>{concept?.label??(selected?resolveTarget(c,ws,selected).title:'Choose a concept or resource')}</h2>{concept?.aliases.length? <p>Also known as: {concept.aliases.join(', ')}</p>:null}{concept?.relatedConceptIds.length?<div className="concept-chips"><span>Related concepts:</span>{concept.relatedConceptIds.map(id=><button key={id} onClick={()=>onState({...state,conceptId:id})}>{index.knowledge.concepts.find(c=>c.id===id)?.label??id}</button>)}</div>:null}
 <div className="reference-filters"><label>Resource type<select aria-label="Reference type filter" value={type} onChange={e=>setType(e.target.value)}>{['All','Notebook','PDF','Cheatsheet','Interview','QCM','Article','Task','Folder','Link'].map(t=><option key={t}>{t}</option>)}</select></label><label>Relationship<select aria-label="Reference direction filter" value={direction} onChange={e=>setDirection(e.target.value)}><option value="all">All relationships</option><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option><option value="related">Related by concept</option></select></label><label>Search<input aria-label="Filter references" value={text} onChange={e=>setText(e.target.value)} placeholder="Title, page or reason"/></label></div>
 <div className="reference-commands"><button onClick={()=>props.onManage(selected)}>Link concept / Add reference</button></div><ReferenceResults rows={rows} total={rows.length} onOpen={props.onOpen} onActions={props.onActions}/></>}
 </section></div></main>;
}
