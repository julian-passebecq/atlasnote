import type {Catalogue,Page,Personal} from '../core/model.js';
import {NORSK_TAG} from './projection.js';
/** V3 Norsk Daily view model. Reads only imported, human-accepted canonical
 * Article/QCM pages (tag `norsk-daily`); it owns no content and no second
 * progress store. Progress is the existing per-page learning flag, keyed by the
 * stable article ID (`norsk-daily.item.<itemId>`), so it survives item
 * revisions, batch reorder, deduplication and daily refresh. */
export type DailyStatus='new'|'learning'|'known';
export type DailyItem={page:Page;status:DailyStatus;language?:string;level?:string;english?:string;grammar:{label:string;pageId:string}[];synthetic:boolean};
export type DailyBatch={date:string;items:DailyItem[];qcm?:Page;synthetic:boolean};
const tagValue=(page:Page,prefix:string)=>page.tags.find(t=>t.startsWith(prefix))?.slice(prefix.length);
/** Existing flags: gray "Not rated", red "Revisit", orange "Learning", green "Understood". */
export function dailyStatus(rating:Personal['ratings'][string]|undefined):DailyStatus{return rating==='green'?'known':rating==='orange'||rating==='red'?'learning':'new';}
export const STATUS_RATING:Record<DailyStatus,'gray'|'orange'|'green'>={new:'gray',learning:'orange',known:'green'};
const ORDER:Record<DailyStatus,number>={new:0,learning:1,known:2};
function osloDate(ms:number){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Oslo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ms));}
export function dailyBatches(c:Catalogue,ratings:Personal['ratings']):DailyBatch[]{
 const byDate=new Map<string,DailyBatch>();
 const batch=(date:string)=>{let b=byDate.get(date);if(!b){b={date,items:[],synthetic:false};byDate.set(date,b);}return b;};
 for(const page of c.pages){
  if(!page.tags.includes(NORSK_TAG.feed))continue;
  // Articles imported before the date tag existed fall back to their observed Oslo day.
  const date=tagValue(page,NORSK_TAG.date)??(page.article?.addedAt?osloDate(page.article.addedAt):undefined);if(!date)continue;
  const b=batch(date),synthetic=page.tags.includes(NORSK_TAG.synthetic);b.synthetic||=synthetic;
  if(page.kind==='qcm'){b.qcm=page;continue;}
  if(page.kind!=='article')continue;
  const headline=page.blocks.find((x:any)=>x.type==='bilingual') as any;
  b.items.push({page,status:dailyStatus(ratings[page.id]),language:tagValue(page,'lang:'),level:tagValue(page,'level:'),english:headline?.en,grammar:(page.resourceLinks??[]).flatMap((l:any)=>l.target?.kind==='page'?[{label:l.label,pageId:l.target.pageId}]:[]),synthetic});
 }
 for(const b of byDate.values())b.items.sort((x,y)=>ORDER[x.status]-ORDER[y.status]||x.page.title.localeCompare(y.page.title,'nb'));
 return [...byDate.values()].sort((a,b)=>b.date.localeCompare(a.date));
}
export type DailyWord={lemma:string;form?:string;partOfSpeech?:string;english?:string;french?:string;example?:string;pageId:string;headline:string};
/** The day's vocabulary, read from each accepted article's generated vocabulary
 * table (no second store). Deduplicated by lemma + part of speech, first story wins. */
export function dailyVocabulary(batch:DailyBatch|undefined):DailyWord[]{
 const out:DailyWord[]=[],seen=new Set<string>();
 for(const item of batch?.items??[]){
  const table=(page=>{let found:any;const walk=(bs:any[])=>bs.forEach(b=>{if(!found&&b.type==='table'&&String(b.id).endsWith('.vocabulary.table'))found=b;if(b.children)walk(b.children);});walk(page.blocks);return found;})(item.page);
  if(!table)continue;const col=(name:string)=>table.columns.indexOf(name);
  for(const row of table.rows as string[][]){
   const cell=(name:string)=>{const i=col(name);return i>=0&&row[i]?row[i]:undefined;},lemma=cell('Lemma');if(!lemma)continue;
   const key=lemma.toLocaleLowerCase('nb')+'|'+(cell('Part of speech')??'');if(seen.has(key))continue;seen.add(key);
   out.push({lemma,form:cell('Form'),partOfSpeech:cell('Part of speech'),english:cell('English'),french:cell('French'),example:cell('Example (generated)'),pageId:item.page.id,headline:item.page.title});
  }
 }
 return out;
}
export function dailyCounts(items:DailyItem[]){return {new:items.filter(i=>i.status==='new').length,learning:items.filter(i=>i.status==='learning').length,known:items.filter(i=>i.status==='known').length};}
