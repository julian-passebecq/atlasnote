import React,{useMemo,useState} from '../vendor/react.mjs';
import {Icon,IconButton} from '../components/Icon.js';
import type {Catalogue,Personal} from '../core/model.js';
import {dailyBatches,dailyCounts,STATUS_RATING} from './daily.js';
import type {DailyStatus} from './daily.js';
type Props={catalogue:Catalogue;personal:Personal;onOpen:(pageId:string,newTab?:boolean)=>void;onStatus:(pageId:string,rating:'gray'|'orange'|'green')=>void;onImport:()=>void;onClose:()=>void};
const LABEL:Record<DailyStatus,string>={new:'New',learning:'Learning',known:'Known'};
/** Daily study queue over accepted Norsk Daily resources: date navigation,
 * New/Learning/Known progress, English reveal, grammar links and the day's QCM.
 * Headlines are source wording; everything else is labelled generated text. */
export function NorskDailyView({catalogue,personal,onOpen,onStatus,onImport,onClose}:Props){
 const batches=useMemo(()=>dailyBatches(catalogue,personal.ratings),[catalogue,personal.ratings]);
 const [date,setDate]=useState<string|undefined>(batches[0]?.date),[english,setEnglish]=useState(false),[filter,setFilter]=useState<DailyStatus|'all'>('all');
 const index=Math.max(0,batches.findIndex(b=>b.date===date)),batch=batches[index];
 const counts=batch?dailyCounts(batch.items):{new:0,learning:0,known:0};
 const shown=batch?batch.items.filter(i=>filter==='all'||i.status===filter):[];
 return <section className="norsk-daily" aria-label="Norsk Daily">
  <header className="norsk-daily-header">
   <div><p className="eyebrow">Norsk</p><h1>Norsk Daily</h1></div>
   {batches.length>0&&<div className="norsk-daily-dates" role="group" aria-label="Study date">
    <IconButton name="left" label="Older study day" disabled={index>=batches.length-1} onClick={()=>setDate(batches[index+1].date)}/>
    <select aria-label="Study date (Europe/Oslo)" value={batch?.date} onChange={e=>setDate(e.target.value)}>{batches.map(b=>{const c=dailyCounts(b.items);return <option key={b.date} value={b.date}>{b.date} ({b.items.length} items, {c.known} known)</option>;})}</select>
    <IconButton name="right" label="Newer study day" disabled={index<=0} onClick={()=>setDate(batches[index-1].date)}/>
   </div>}
   <IconButton name="close" label="Close Norsk Daily" onClick={onClose}/>
  </header>
  {!batch?<div className="empty-state norsk-daily-empty"><Icon name="language" size={28}/><h2>No Norsk Daily batch yet</h2>
    <p>Transform permitted headline metadata with the exported prompt, then import the JSON. It becomes study material only after you accept it in review.</p>
    <button className="primary" onClick={onImport}>Open review to import a feed</button></div>:<>
   {batch.synthetic&&<p className="norsk-daily-synthetic" role="note"><strong>Synthetic fixture.</strong> Invented study text for testing, not real news.</p>}
   <div className="norsk-daily-toolbar">
    <div className="norsk-daily-filters" role="group" aria-label="Filter by progress">
     {(['all','new','learning','known'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'All ('+batch.items.length+')':LABEL[f]+' ('+counts[f]+')'}</button>)}
    </div>
    <label className="norsk-daily-english"><input type="checkbox" checked={english} onChange={e=>setEnglish(e.target.checked)}/>Show English</label>
    {batch.qcm&&<button className="primary" onClick={()=>onOpen(batch.qcm!.id)}><Icon name="help" size={15}/>Practice {batch.qcm.qcm?.questions.length??0} questions</button>}
   </div>
   <ol className="norsk-daily-queue">{shown.map(item=><li key={item.page.id} className={'norsk-daily-item status-'+item.status} data-page-id={item.page.id}>
    <div className="norsk-daily-headline">
     <span className="norsk-daily-lang" title={item.language==='nn'?'Nynorsk':'Bokmål'}>{item.language??'nb'}</span>{item.level&&<span className="norsk-daily-level">{item.level}</span>}
     <button className="text-button norsk-daily-title" title="Headline: source wording" onClick={e=>onOpen(item.page.id,e.ctrlKey||e.metaKey)}>{item.page.title}</button>
    </div>
    {english&&item.english&&<p className="norsk-daily-en"><span className="sr-only">English (generated): </span>{item.english}</p>}
    <div className="norsk-daily-actions">
     <div className="norsk-daily-status" role="group" aria-label={'Progress for '+item.page.title}>
      {(['new','learning','known'] as const).map(s=><button key={s} aria-pressed={item.status===s} onClick={()=>onStatus(item.page.id,STATUS_RATING[s])}>{LABEL[s]}</button>)}
     </div>
     {item.grammar.map(g=><button key={g.pageId} className="text-button norsk-daily-grammar" onClick={()=>onOpen(g.pageId)}><Icon name="link" size={13}/>{g.label}</button>)}
    </div>
   </li>)}</ol>
   {!shown.length&&<p className="experience-note">No items with this progress on {batch.date}.</p>}
   <p className="norsk-daily-note">Progress uses your learning flags (Learning / Understood) on each stable story, so it survives corrections and re-imports. Study day: {batch.date}, Europe/Oslo.</p>
  </>}
 </section>;
}
