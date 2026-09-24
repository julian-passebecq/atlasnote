import type {Page,Block} from '../core/model.js';
import type {QcmDocument,QcmQuestion,TaxonomyRef} from '../content-hub/model.js';
import {validateNorskDailyFeed,contentHash,osloDayInterval,osloDateOf,parseTimestamp} from './validation.mjs';
import {validateHubPage} from '../content-hub/validation.mjs';

/** Pure, deterministic projection of a validated Norsk Daily feed into EXISTING
 * AtlasNote resource shapes: one native Article per logical story and one native
 * QCM per batch. No sixth type, store or workspace. No clock, randomness, DOM,
 * storage or network access: equal feeds always produce equal pages. */
export type NorskDailyFeed={schema:string;schemaVersion:2;kind:string;feedId:string;batchId:string;batchRevision:number;studyDate:string;timezone:'Europe/Oslo';collectionInterval:{start:string;end:string};generatedAt:string;
 source:{publisher:string;publisherId:string;permission:{status:'synthetic-fixture'|'user-supplied-private-study'|'permission-unverified';note:string};hosts?:string[]};
 coverage:{kind:'partial-snapshot'|'user-selection'|'complete-subscribed-sources';statement:string;completeEvidence?:unknown};
 transform:{method:string;promptId:string;tool?:string};review:{status:'proposal'};items:NorskDailyItem[]};
type Generated={text:string;origin:'generated'};
export type NorskDailyItem={itemId:string;revision:number;sourceId:string;sourceUrl?:string|null;sourcePublishedAt:string|null;observedAt:string;section?:string;language:'nb'|'nn';difficulty:'A2'|'B1'|'B2'|'C1';
 headline:{text:string;origin:'source'};study:{paraphrase:Generated;translations:{en:Generated;fr?:Generated};uncertainty?:string[]};
 vocabulary:{lemma:string;form?:string;partOfSpeech:string;en:string;fr?:string;example?:Generated}[];
 grammar?:{pageId:string;label:string;note?:Generated}[];
 questions?:{questionId:string;origin:'generated';prompt:string;options:{optionId:string;text:string}[];correctOptionIds:string[];explanation?:string}[]};
export type ProjectedArticle={itemId:string;sourceId:string;revision:number;contentHash:string;pageId:string;resourceKey:string;page:Page;taxonomy:TaxonomyRef;reappeared:boolean};
export type ProjectedQcm={batchId:string;batchRevision:number;contentHash:string;pageId:string;resourceKey:string;page:Page;taxonomy:TaxonomyRef};
export type DuplicateReport={sourceId:string;itemId:string;keptRevision:number;droppedRevisions:number[];entries:number};
export type NorskDailyProjection={feed:NorskDailyFeed;articles:ProjectedArticle[];qcm?:ProjectedQcm;duplicates:DuplicateReport[]};

export const NORSK_TAG={feed:'norsk-daily',synthetic:'synthetic-fixture',item:'norsk-daily-item:',revision:'norsk-daily-revision:',content:'norsk-daily-content:',source:'norsk-daily-source:',batch:'norsk-daily-batch:',batchRevision:'norsk-daily-batch-revision:',date:'norsk-daily-date:'} as const;
export const articlePageId=(itemId:string)=>'norsk-daily.item.'+itemId;
export const qcmPageId=(batchId:string)=>'norsk-daily.qcm.'+batchId;
const NORSK:TaxonomyRef={subject:'norsk'};
const LANGUAGE_LABEL={nb:'Bokmal (nb)',nn:'Nynorsk (nn)'} as const;

/** Keep one entry per publisher sourceId: the highest revision. Consistency of
 * equal revisions and itemId/sourceId pairs is enforced by the validator. */
export function dedupeItems(items:NorskDailyItem[]):{items:NorskDailyItem[];duplicates:DuplicateReport[]}{
 const groups=new Map<string,NorskDailyItem[]>();for(const item of items)groups.set(item.sourceId,[...(groups.get(item.sourceId)??[]),item]);
 const kept:NorskDailyItem[]=[],duplicates:DuplicateReport[]=[];
 for(const [sourceId,entries] of groups){const best=entries.reduce((a,b)=>b.revision>a.revision?b:a);kept.push(best);if(entries.length>1)duplicates.push({sourceId,itemId:best.itemId,keptRevision:best.revision,droppedRevisions:[...new Set(entries.map(e=>e.revision).filter(r=>r!==best.revision))].sort((a,b)=>a-b),entries:entries.length});}
 // Reorder-invariant: the projection never depends on array order.
 kept.sort((a,b)=>a.itemId<b.itemId?-1:a.itemId>b.itemId?1:0);duplicates.sort((a,b)=>a.itemId<b.itemId?-1:1);
 return {items:kept,duplicates};
}
function itemHash(feed:NorskDailyFeed,item:NorskDailyItem){return contentHash({item,publisher:feed.source.publisher,publisherId:feed.source.publisherId,permission:feed.source.permission.status,transform:feed.transform.method});}

function articleFor(feed:NorskDailyFeed,item:NorskDailyItem):ProjectedArticle{
 const pageId=articlePageId(item.itemId),hash=itemHash(feed,item),synthetic=feed.source.permission.status==='synthetic-fixture';
 const observed=parseTimestamp(item.observedAt,'observedAt'),published=item.sourcePublishedAt===null?undefined:parseTimestamp(item.sourcePublishedAt,'sourcePublishedAt');
 // A rolling feed can resurface an older story. Keep the source publication day
 // separate from the Oslo day on which the story was observed.
 const reappeared=published!==undefined&&published<osloDayInterval(osloDateOf(observed)).start;
 const fr=item.study.translations.fr,b=(suffix:string)=>pageId+'.'+suffix;
 const generatedChildren:Block[]=[{id:b('paraphrase'),type:'callout',tone:'info',title:'Simpler Norwegian paraphrase (generated, '+item.language+')',text:item.study.paraphrase.text}];
 if(fr)generatedChildren.push({id:b('french'),type:'callout',tone:'info',title:'French translation (generated, optional)',text:fr.text});
 if(item.study.uncertainty?.length)generatedChildren.push({id:b('uncertainty'),type:'callout',tone:'warning',title:'Uncertainty flags (generated)',text:item.study.uncertainty.join(' / ')});
 const vocabColumns=['Lemma','Form','Part of speech','English',...(item.vocabulary.some(v=>v.fr)?['French']:[]),'Example (generated)'];
 const vocabRows=item.vocabulary.map(v=>[v.lemma,v.form??'',v.partOfSpeech,v.en,...(vocabColumns.includes('French')?[v.fr??'']:[]),v.example?.text??'']);
 const grammar=item.grammar??[];
 const blocks:Block[]=[
  {id:b('provenance'),type:'callout',tone:synthetic?'warning':'info',title:synthetic?'SYNTHETIC FIXTURE - invented study text, not real news':'Source metadata and labelling',
   text:'Headline: source wording as supplied by '+feed.source.publisher+' ('+LANGUAGE_LABEL[item.language]+', source ID '+item.sourceId+'). Everything else on this page is generated study text, not source wording. Published: '+(item.sourcePublishedAt??'unknown')+'. Observed: '+item.observedAt+(reappeared?' (published before the Oslo day on which it was observed).':'.')+' Level '+item.difficulty+(item.section?', section '+item.section:'')+'. Item revision '+item.revision+'.'},
  {id:b('headline'),type:'bilingual',no:item.headline.text,en:item.study.translations.en.text,hint:'NO: source wording ('+item.language+'). EN: generated translation, not source wording.'},
  {id:b('generated'),type:'section',title:'Generated study text (not source wording)',children:generatedChildren},
  {id:b('vocabulary'),type:'section',title:'Vocabulary (generated)',children:[{id:b('vocabulary.table'),type:'table',columns:vocabColumns,rows:vocabRows}]},
  ...(grammar.length?[{id:b('grammar'),type:'section',title:'Grammar links',children:grammar.map((g,i)=>({id:b('grammar.'+(i+1)),type:'resource-link',label:g.label,...(g.note?{description:g.note.text+' (generated note)'}:{}),target:{kind:'page',pageId:g.pageId}}))} as Block]:[])
 ];
 const tags=[NORSK_TAG.feed,...(synthetic?[NORSK_TAG.synthetic]:[]),'lang:'+item.language,'level:'+item.difficulty,NORSK_TAG.item+item.itemId,NORSK_TAG.revision+item.revision,NORSK_TAG.content+hash,NORSK_TAG.source+feed.source.publisherId+'/'+item.sourceId];
 const url=item.sourceUrl??undefined;
 const page:Page={id:pageId,title:item.headline.text,summary:'Norsk Daily study item ('+LANGUAGE_LABEL[item.language]+', '+item.difficulty+'). Headline = source wording; translation, paraphrase, vocabulary and notes = generated study text.',
  blocks,related:[],terms:[],sources:[{title:'Headline metadata: '+feed.source.publisher,publisher:feed.source.publisher,...(url?{url}:{}),note:'Only the headline wording is source material. The article body is not mirrored.'}],tags,
  provenance:'Imported through '+feed.schema+'@'+feed.schemaVersion+' (feed '+feed.feedId+', permission '+feed.source.permission.status+', transform '+feed.transform.method+'). Accepted only through Agent Review.',
  kind:'article',article:{id:pageId,title:item.headline.text,publisher:feed.source.publisher,sourceType:url?'link':'article',...(url?{url}:{}),taxonomy:structuredClone(NORSK),addedAt:observed},
  ...(grammar.length?{resourceLinks:grammar.map(g=>({label:g.label,target:{kind:'page' as const,pageId:g.pageId}}))}:{})};
 validateHubPage(page);
 return {itemId:item.itemId,sourceId:item.sourceId,revision:item.revision,contentHash:hash,pageId,resourceKey:'article:'+pageId,page,taxonomy:structuredClone(NORSK),reappeared};
}
/** Question IDs carry a content hash: an edited question gets a new ID, so an
 * old answer is never graded against a silently changed question. An unchanged
 * question keeps its ID (and its progress) across item/batch revisions. */
export function questionIdFor(item:NorskDailyItem,q:NonNullable<NorskDailyItem['questions']>[number]){return 'nd.'+item.itemId+'.'+q.questionId+'.v'+contentHash({language:item.language,prompt:q.prompt,options:q.options,correctOptionIds:q.correctOptionIds,explanation:q.explanation??null}).slice(0,8);}
function qcmFor(feed:NorskDailyFeed,items:NorskDailyItem[]):ProjectedQcm|undefined{
 const questions:QcmQuestion[]=items.flatMap(item=>(item.questions??[]).map(q=>({id:questionIdFor(item,q),prompt:q.prompt,options:q.options.map(o=>({id:o.optionId,text:o.text})),correctOptionIds:[...q.correctOptionIds],...(q.explanation?{explanation:q.explanation}:{}),tags:['norsk-daily','lang:'+item.language,'generated'],links:[{label:'Headline study page',target:{kind:'article' as const,articleId:articlePageId(item.itemId),pageId:articlePageId(item.itemId)}}]})));
 if(!questions.length)return;
 const pageId=qcmPageId(feed.batchId),title='Norsk Daily '+feed.studyDate+' practice',hash=contentHash({questions,studyDate:feed.studyDate,batchId:feed.batchId,feedId:feed.feedId});
 const qcm:QcmDocument={schemaVersion:1,id:pageId,title,taxonomy:structuredClone(NORSK),questions};
 const page:Page={id:pageId,title,summary:questions.length+' generated practice questions for Norsk Daily '+feed.studyDate+'. Practice and review, without a timer.',blocks:[],related:[],terms:[],sources:[],
  tags:[NORSK_TAG.feed,...(feed.source.permission.status==='synthetic-fixture'?[NORSK_TAG.synthetic]:[]),NORSK_TAG.batch+feed.batchId,NORSK_TAG.batchRevision+feed.batchRevision,NORSK_TAG.content+hash,NORSK_TAG.date+feed.studyDate],
  provenance:'Generated questions imported through '+feed.schema+'@'+feed.schemaVersion+' (feed '+feed.feedId+', coverage '+feed.coverage.kind+'). Accepted only through Agent Review.',kind:'qcm',qcm};
 validateHubPage(page);
 return {batchId:feed.batchId,batchRevision:feed.batchRevision,contentHash:hash,pageId,resourceKey:'qcm:'+pageId,page,taxonomy:structuredClone(NORSK)};
}
export function projectNorskDailyFeed(input:unknown):NorskDailyProjection{
 const feed=validateNorskDailyFeed(input) as NorskDailyFeed,{items,duplicates}=dedupeItems(feed.items);
 return {feed,articles:items.map(item=>articleFor(feed,item)),qcm:qcmFor(feed,items),duplicates};
}
