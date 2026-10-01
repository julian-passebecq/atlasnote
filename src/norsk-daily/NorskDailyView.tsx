import React,{useEffect,useMemo,useRef,useState} from '../vendor/react.mjs';
import {Icon,IconButton} from '../components/Icon.js';
import type {Catalogue,Personal} from '../core/model.js';
import {dailyBatches,dailyCounts,dailyItemVocabulary,dailySearch,dailySections,dailyVocabulary,dailyVocabularySearch,STATUS_RATING} from './daily.js';
import type {DailyItem,DailyStatus} from './daily.js';

type Props={catalogue:Catalogue;personal:Personal;onOpen:(pageId:string,newTab?:boolean)=>void;onStatus:(pageId:string,rating:'gray'|'orange'|'green')=>void;onImport:()=>void;onAddVocabulary?:(words:import('./daily.js').DailyWord[],date:string)=>void;onClose:()=>void};
const LABEL:Record<DailyStatus,string>={new:'New',learning:'Learning',known:'Known'};

/** Daily study surface over accepted Norsk Daily resources. The newspaper is a
 * navigation/study projection only: source headlines stay source wording while
 * translations/paraphrases/vocabulary are visibly generated text. Focus mode
 * keeps Norwegian and English in one aligned two-column layout with one scroll
 * container. No remote source is fetched from this component. */
export function NorskDailyView({catalogue,personal,onOpen,onStatus,onImport,onAddVocabulary,onClose}:Props){
 const batches=useMemo(()=>dailyBatches(catalogue,personal.ratings),[catalogue,personal.ratings]);
 const [date,setDate]=useState<string|undefined>(batches[0]?.date);
 const [english,setEnglish]=useState(false);
 const [filter,setFilter]=useState<DailyStatus|'all'>('all');
 const [view,setView]=useState<'newspaper'|'focus'|'vocabulary'>('newspaper');
 const [revealed,setRevealed]=useState<Record<string,boolean>>({});
 const [query,setQuery]=useState('');
 const [section,setSection]=useState('all');
 const [selectedId,setSelectedId]=useState<string|undefined>();
 const searchRef=useRef<HTMLInputElement>(null);

 const index=Math.max(0,batches.findIndex(b=>b.date===date)),batch=batches[index];
 const counts=batch?dailyCounts(batch.items):{new:0,learning:0,known:0};
 const sections=useMemo(()=>dailySections(batch),[batch]);
 const searched=useMemo(()=>dailySearch(batch?.items??[],query),[batch,query]);
 const sectioned=section==='all'?searched:searched.filter(i=>i.section===section);
 const shown=sectioned.filter(i=>filter==='all'||i.status===filter);
 const words=useMemo(()=>dailyVocabulary(batch),[batch]);
 const shownWords=useMemo(()=>dailyVocabularySearch(words,query),[words,query]);
 const selected=shown.find(i=>i.page.id===selectedId)??shown[0];
 const focusIndex=selected?shown.findIndex(i=>i.page.id===selected.page.id):-1;
 useEffect(()=>{const key=(e:KeyboardEvent)=>{const target=e.target as HTMLElement|null;if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA','SELECT'].includes(target?.tagName??'')){e.preventDefault();searchRef.current?.focus();}};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[]);

 const statusButtons=(item:DailyItem)=><div className="norsk-daily-status" role="group" aria-label={'Progress for '+item.page.title}>
  {(['new','learning','known'] as const).map(s=><button key={s} aria-pressed={item.status===s} onClick={()=>onStatus(item.page.id,STATUS_RATING[s])}>{LABEL[s]}</button>)}
 </div>;
 const grammarButtons=(item:DailyItem)=>item.grammar.map(g=><button key={g.pageId} className="text-button norsk-daily-grammar" onClick={()=>onOpen(g.pageId)}><Icon name="link" size={13}/>{g.label}</button>);
 const openFocus=(item:DailyItem)=>{setSelectedId(item.page.id);setEnglish(true);setView('focus');};
 const moveFocus=(step:number)=>{if(!shown.length)return;const next=shown[Math.max(0,Math.min(shown.length-1,(focusIndex<0?0:focusIndex)+step))];if(next)setSelectedId(next.page.id);};

 return <section className="norsk-daily" aria-label="Norsk Daily">
  <header className="norsk-daily-header">
   <div><p className="eyebrow">Norsk</p><h1>Norsk Daily</h1></div>
   {batches.length>0&&<div className="norsk-daily-dates" role="group" aria-label="Study date">
    <IconButton name="left" label="Older study day" disabled={index>=batches.length-1} onClick={()=>{setDate(batches[index+1].date);setSection('all');setSelectedId(undefined);setView('newspaper');}}/>
    <select aria-label="Study date (Europe/Oslo)" value={batch?.date} onChange={e=>{setDate(e.target.value);setSection('all');setSelectedId(undefined);setView('newspaper');}}>{batches.map(b=>{const c=dailyCounts(b.items);return <option key={b.date} value={b.date}>{b.date} ({b.items.length} items, {c.known} known)</option>;})}</select>
    <IconButton name="right" label="Newer study day" disabled={index<=0} onClick={()=>{setDate(batches[index-1].date);setSection('all');setSelectedId(undefined);setView('newspaper');}}/>
   </div>}
   <IconButton name="close" label="Close Norsk Daily" onClick={onClose}/>
  </header>

  {!batch?<div className="empty-state norsk-daily-empty"><Icon name="language" size={28}/><h2>No Norsk Daily batch yet</h2>
    <p>Transform permitted headline metadata with the exported prompt, then import the JSON. It becomes study material only after you accept it in review.</p>
    <button className="primary" onClick={onImport}>Open review to import a feed</button></div>:<>
   {batch.synthetic&&<p className="norsk-daily-synthetic" role="note"><strong>Synthetic fixture.</strong> Invented study text for testing, not real news.</p>}

   <div className="norsk-daily-views" role="tablist" aria-label="Norsk Daily view">
    <button role="tab" aria-selected={view==='newspaper'} onClick={()=>setView('newspaper')}>Newspaper ({batch.items.length})</button>
    <button role="tab" aria-selected={view==='focus'} disabled={!selected&&shown.length===0} onClick={()=>{if(selected||shown[0]){setSelectedId((selected??shown[0]).page.id);setEnglish(true);setView('focus');}}}>Focus</button>
    <button role="tab" aria-selected={view==='vocabulary'} onClick={()=>setView('vocabulary')}>Vocabulary ({words.length})</button>
   </div>

   {sections.length>0&&<div className="norsk-daily-sections" role="group" aria-label="Filter Norsk Daily by topic"><button aria-pressed={section==='all'} onClick={()=>setSection('all')}>All topics</button>{sections.map(s=><button key={s} aria-pressed={section===s} onClick={()=>setSection(s)}>{s} ({batch.items.filter(i=>i.section===s).length})</button>)}</div>}

   <div className="norsk-daily-toolbar">
    <label className="norsk-daily-search"><span className="sr-only">Search Norsk Daily</span><input ref={searchRef} aria-label="Search Norsk Daily" type="search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){setQuery('');e.currentTarget.blur();}}} placeholder={view==='vocabulary'?'Find a word or meaning...':'Find headline, translation or vocabulary...'} title="Press / to search"/>{query&&<button type="button" className="text-button" aria-label="Clear Norsk Daily search" onClick={()=>setQuery('')}>Clear</button>}</label>
    {view!=='vocabulary'&&<div className="norsk-daily-filters" role="group" aria-label="Filter by progress">
     {(['all','new','learning','known'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'All ('+batch.items.length+')':LABEL[f]+' ('+counts[f]+')'}</button>)}
    </div>}
    {view!=='vocabulary'&&<label className="norsk-daily-english"><input type="checkbox" checked={english} onChange={e=>setEnglish(e.target.checked)}/>Show English</label>}
    <span className="norsk-daily-results" role="status" aria-live="polite">{view==='vocabulary'?shownWords.length+' words':shown.length+' stories'}</span>
    {batch.qcm&&<button className="primary" onClick={()=>onOpen(batch.qcm!.id)}><Icon name="help" size={15}/>Practice {batch.qcm.qcm?.questions.length??0} questions</button>}
   </div>

   {view==='vocabulary'?<div className="norsk-daily-vocab">
    <p className="norsk-daily-note">Generated vocabulary from the day's accepted stories. Say the meaning, then reveal it. <button className="text-button" onClick={()=>setRevealed(Object.fromEntries(shownWords.map(w=>[w.lemma+'|'+(w.partOfSpeech??''),true])))}>Reveal visible</button> <button className="text-button" onClick={()=>setRevealed({})}>Hide all</button>{onAddVocabulary&&words.length>0&&<button className="text-button norsk-daily-concepts" title="Prepares a reviewed proposal; nothing is added until you accept it" onClick={()=>onAddVocabulary(words,batch.date)}>Add to Concept Index…</button>}</p>
    <ul>{shownWords.map(w=>{const key=w.lemma+'|'+(w.partOfSpeech??''),open=!!revealed[key];return <li key={key} className="norsk-daily-word"><div><strong lang="no">{w.lemma}</strong>{w.form&&w.form!==w.lemma&&<span className="norsk-daily-form" lang="no">{w.form}</span>}{w.partOfSpeech&&<small>{w.partOfSpeech}</small>}</div>
     {open?<p className="norsk-daily-meaning">{w.english}{w.french&&<span> / {w.french}</span>}{w.example&&<em lang="no"> {w.example}</em>}</p>:<button className="text-button" aria-label={'Reveal meaning of '+w.lemma} onClick={()=>setRevealed({...revealed,[key]:true})}>Reveal</button>}
     <button className="text-button norsk-daily-source" title={'From: '+w.headline} onClick={()=>onOpen(w.pageId)}>Story</button></li>;})}</ul>
    {!shownWords.length&&<p className="experience-note">{query?'No vocabulary matches this search.':'No vocabulary in this day\'s stories.'}</p>}
   </div>:view==='focus'?selected?<FocusStory item={selected} english={english} words={dailyItemVocabulary(selected)} position={focusIndex} total={shown.length} onBack={()=>setView('newspaper')} onPrevious={()=>moveFocus(-1)} onNext={()=>moveFocus(1)} onReveal={()=>setEnglish(true)} onOpen={onOpen} status={statusButtons(selected)} grammar={grammarButtons(selected)}/>:<p className="experience-note">No story matches the current search and progress filter.</p>:<>
    <ol className="norsk-daily-queue norsk-daily-paper">{shown.map((item,itemIndex)=><li key={item.page.id} className={'norsk-daily-item status-'+item.status+(itemIndex===0?' norsk-daily-lead':'')} data-page-id={item.page.id}>
     <div className="norsk-daily-headline">
      <span className="norsk-daily-lang" title={item.language==='nn'?'Nynorsk':'Bokmål'}>{item.language??'nb'}</span>{item.level&&<span className="norsk-daily-level">{item.level}</span>}{item.section&&<span className="norsk-daily-section">{item.section}</span>}
      <button className="text-button norsk-daily-title" title="Headline: source wording" onClick={e=>onOpen(item.page.id,e.ctrlKey||e.metaKey)}>{item.page.title}</button>
     </div>
     {item.paraphrase&&<p className="norsk-daily-paraphrase" lang="no"><span>Generated simpler Norwegian</span>{item.paraphrase}</p>}
     {english&&item.english&&<p className="norsk-daily-en"><span className="sr-only">English (generated): </span>{item.english}</p>}
     <div className="norsk-daily-actions">
      {statusButtons(item)}
      <button className="text-button norsk-daily-study" onClick={()=>openFocus(item)}>Study side by side</button>
      {grammarButtons(item)}
     </div>
    </li>)}</ol>
    {!shown.length&&<p className="experience-note">{query?'No stories match this search and progress filter.':'No items with this progress on '+batch.date+'.'}</p>}
   </>}

   <p className="norsk-daily-note">Progress uses your learning flags (Learning / Understood) on each stable story, so it survives corrections and re-imports. Search is local to accepted study content already stored in this browser. Study day: {batch.date}, Europe/Oslo.</p>
  </>}
 </section>;
}

function FocusStory({item,english,words,position,total,onBack,onPrevious,onNext,onReveal,onOpen,status,grammar}:{item:DailyItem;english:boolean;words:import('./daily.js').DailyWord[];position:number;total:number;onBack:()=>void;onPrevious:()=>void;onNext:()=>void;onReveal:()=>void;onOpen:(pageId:string,newTab?:boolean)=>void;status:any;grammar:any}){
 return <article className={'norsk-daily-focus status-'+item.status} data-page-id={item.page.id}>
  <header className="norsk-daily-focus-header">
   <button className="text-button" onClick={onBack}>← Newspaper</button>
   <span>{total?position+1:0} / {total}</span>
   <div><IconButton name="left" label="Previous matching story" disabled={position<=0} onClick={onPrevious}/><IconButton name="right" label="Next matching story" disabled={position<0||position>=total-1} onClick={onNext}/></div>
  </header>
  <div className="norsk-daily-focus-meta"><span className="norsk-daily-lang" title={item.language==='nn'?'Nynorsk':'Bokmål'}>{item.language??'nb'}</span>{item.level&&<span className="norsk-daily-level">{item.level}</span>}{item.section&&<span className="norsk-daily-section">{item.section}</span>}<span>{LABEL[item.status]}</span></div>
  <div className="norsk-daily-focus-grid">
   <section className="norsk-daily-focus-no" lang="no"><p className="eyebrow">Norwegian / source headline</p><h2>{item.page.title}</h2>{item.paraphrase&&<div className="norsk-daily-focus-paraphrase"><span>Generated simpler Norwegian</span><p>{item.paraphrase}</p></div>}</section>
   <section className={'norsk-daily-focus-en'+(english?'':' is-hidden')} lang="en"><p className="eyebrow">English / generated translation</p>{english&&item.english?<h2>{item.english}</h2>:<div className="norsk-daily-focus-hidden"><p>Translation hidden for recall.</p><button onClick={onReveal}>Reveal English</button></div>}{english&&item.french&&<details><summary>French translation</summary><p lang="fr">{item.french}</p></details>}</section>
  </div>
  {words.length>0&&<section className="norsk-daily-focus-vocab" aria-label="Story vocabulary"><h3>Vocabulary</h3><div>{words.map(w=><span key={w.lemma+'|'+(w.partOfSpeech??'')} title={[w.english,w.partOfSpeech].filter(Boolean).join(' · ')}><strong lang="no">{w.lemma}</strong>{w.english&&<small>{w.english}</small>}</span>)}</div></section>}
  <footer className="norsk-daily-focus-actions">{status}<button className="primary" onClick={()=>onOpen(item.page.id)}>Open full Atlas study page</button>{grammar}</footer>
 </article>;
}
