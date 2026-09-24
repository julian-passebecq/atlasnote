import type {ResourceSnapshot} from '../history/model.js';
import type {AgentChangeSet,AgentOperation} from '../agent/model.js';
import type {AgentInterface} from '../agent/service.js';
import type {Page} from '../core/model.js';
import {validateChangeSet} from '../agent/validation.js';
import {parseNorskDailyJSON,contentHash} from './validation.mjs';
import {projectNorskDailyFeed,NORSK_TAG} from './projection.js';
import type {NorskDailyProjection,ProjectedArticle,ProjectedQcm,DuplicateReport} from './projection.js';

/** Norsk Daily import = a reviewed Agent ChangeSet proposal. This module never
 * writes storage, never stages implicitly and never accepts: the human decision
 * stays in Agent Review (preview -> stage -> explicit accept/reject). */
export type ExistingResource={head?:{revisionId:string}|null;snapshot:ResourceSnapshot};
export type ResourceLookup=(resourceKey:string)=>ExistingResource|undefined;
export type ImportAction='create'|'update'|'unchanged'|'rejected';
export type ImportRow={resourceKey:string;pageId:string;action:ImportAction;revision:number;previousRevision?:number;itemId?:string;sourceId?:string;message:string};
export type NorskDailyImportPlan={projection:NorskDailyProjection;items:ImportRow[];qcm?:ImportRow;duplicates:DuplicateReport[];blocked:boolean;messages:string[];changeSet?:AgentChangeSet};

const tagValue=(page:Page|undefined,prefix:string)=>page?.tags?.find(t=>t.startsWith(prefix))?.slice(prefix.length);
const revisionTag=(page:Page|undefined,prefix:string)=>{const v=tagValue(page,prefix);return v!==undefined&&/^\d{1,5}$/.test(v)?Number(v):undefined;};

/** Compare against the imported revision recorded on the canonical page itself. */
function decide(existing:ExistingResource|undefined,key:string,pageId:string,label:string,ownerTag:string,revisionPrefix:string,revision:number,hash:string):Omit<ImportRow,'resourceKey'|'pageId'|'revision'>{
 if(!existing)return {action:'create',message:label+' revision '+revision+' will be created.'};
 const page=existing.snapshot.page;
 if(!page||page.id!==pageId||!page.tags?.includes(ownerTag))return {action:'rejected',message:key+' already exists but was not created by Norsk Daily import. Refusing to overwrite an unrelated resource.'};
 const previous=revisionTag(page,revisionPrefix),previousHash=tagValue(page,NORSK_TAG.content);
 if(previous===undefined)return {action:'rejected',message:key+' has no recorded Norsk Daily revision; it cannot be compared safely.'};
 if(revision<previous)return {action:'rejected',previousRevision:previous,message:label+' revision '+revision+' is older than the already imported revision '+previous+'. Lower revisions are rejected; nothing was changed.'};
 if(revision===previous)return previousHash===hash?{action:'unchanged',previousRevision:previous,message:label+' revision '+revision+' is already imported (no-op).'}:{action:'rejected',previousRevision:previous,message:label+' revision '+revision+' was already imported with different content. Publish the correction as revision '+(previous+1)+' or higher.'};
 if(!existing.head?.revisionId)return {action:'rejected',previousRevision:previous,message:key+' has no history head; initialise history before updating.'};
 return {action:'update',previousRevision:previous,message:label+' revision '+previous+' -> '+revision+' will update the same resource ID.'};
}
/** Reading/progress-like article fields belong to the reader, not the feed. */
function mergeArticle(projected:ProjectedArticle,existing:ExistingResource):ResourceSnapshot{
 const old=existing.snapshot.page!,page=structuredClone(projected.page),oldMeta=old.article;
 if(oldMeta){const meta=page.article!;meta.addedAt=oldMeta.addedAt;for(const k of ['status','important','note','contextTarget'] as const)if(oldMeta[k]!==undefined)(meta as any)[k]=structuredClone(oldMeta[k]);
  if(oldMeta.taxonomy?.subject==='norsk')meta.taxonomy=structuredClone(oldMeta.taxonomy);}
 page.related=structuredClone(old.related??[]);page.terms=structuredClone(old.terms??[]);
 return {...structuredClone(existing.snapshot),page,taxonomy:structuredClone(page.article!.taxonomy!)};
}
function mergeQcm(projected:ProjectedQcm,existing:ExistingResource):ResourceSnapshot{
 const old=existing.snapshot.page!,page=structuredClone(projected.page);
 if(old.qcm?.taxonomy?.subject==='norsk')page.qcm!.taxonomy=structuredClone(old.qcm.taxonomy);
 return {...structuredClone(existing.snapshot),page,taxonomy:structuredClone(page.qcm!.taxonomy!)};
}
/** changeSetSuffix lets a UI re-propose the same batch after a rejected review
 * (review IDs are never reused) while keeping the batch identity in the ID. */
export type PlanOptions={createdAt:number;changeSetId?:string;changeSetSuffix?:string;now?:number};
/** Deterministic for equal (feed, library state, options). */
export function planNorskDailyImport(input:unknown,lookup:ResourceLookup,options:PlanOptions):NorskDailyImportPlan{
 const projection=typeof input==='string'?projectNorskDailyFeed(parseNorskDailyJSON(input,{now:options.now})):projectNorskDailyFeed(input);
 const {feed}=projection,operations:AgentOperation[]=[];
 const items:ImportRow[]=projection.articles.map(a=>{const existing=lookup(a.resourceKey),d=decide(existing,a.resourceKey,a.pageId,'Item '+a.itemId,NORSK_TAG.item+a.itemId,NORSK_TAG.revision,a.revision,a.contentHash);
  if(d.action==='create')operations.push({id:'norsk-daily.create.'+a.itemId,kind:'resource.create',resourceKey:a.resourceKey,baseRevisionId:null,payload:{resourceType:'article',snapshot:{page:a.page,taxonomy:a.taxonomy}},rationale:'New Norsk Daily item '+a.itemId+' revision '+a.revision+' (source '+a.sourceId+').'});
  if(d.action==='update')operations.push({id:'norsk-daily.update.'+a.itemId,kind:'resource.update',resourceKey:a.resourceKey,baseRevisionId:existing!.head!.revisionId,payload:{resourceType:'article',snapshot:mergeArticle(a,existing!)},rationale:'Norsk Daily correction: item '+a.itemId+' revision '+d.previousRevision+' -> '+a.revision+'. Reading status/notes are preserved.'});
  return {resourceKey:a.resourceKey,pageId:a.pageId,itemId:a.itemId,sourceId:a.sourceId,revision:a.revision,...d};});
 let qcm:ImportRow|undefined;
 if(projection.qcm){const q=projection.qcm,existing=lookup(q.resourceKey),d=decide(existing,q.resourceKey,q.pageId,'Batch '+q.batchId,NORSK_TAG.batch+q.batchId,NORSK_TAG.batchRevision,q.batchRevision,q.contentHash);
  if(d.action==='create')operations.push({id:'norsk-daily.qcm.create',kind:'resource.create',resourceKey:q.resourceKey,baseRevisionId:null,payload:{resourceType:'qcm',snapshot:{page:q.page,taxonomy:q.taxonomy}},rationale:'Generated practice questions for Norsk Daily '+feed.studyDate+'.'});
  if(d.action==='update')operations.push({id:'norsk-daily.qcm.update',kind:'resource.update',resourceKey:q.resourceKey,baseRevisionId:existing!.head!.revisionId,payload:{resourceType:'qcm',snapshot:mergeQcm(q,existing!)},rationale:'Norsk Daily batch revision '+d.previousRevision+' -> '+q.batchRevision+'. Changed questions receive new IDs; existing attempts are untouched.'});
  qcm={resourceKey:q.resourceKey,pageId:q.pageId,revision:q.batchRevision,...d};}
 const rows=[...items,...(qcm?[qcm]:[])],rejected=rows.filter(r=>r.action==='rejected'),blocked=rejected.length>0;
 const count=(a:ImportAction)=>rows.filter(r=>r.action===a).length;
 const messages=blocked?rejected.map(r=>r.message):[count('create')+' to create, '+count('update')+' to update, '+count('unchanged')+' unchanged'+(projection.duplicates.length?', '+projection.duplicates.length+' duplicate source entries collapsed':'')+'. Coverage: '+feed.coverage.kind+'.'];
 let changeSet:AgentChangeSet|undefined;
 if(!blocked&&operations.length){
  const id=options.changeSetId??'norsk-daily.'+feed.batchId+'.r'+feed.batchRevision+'.'+contentHash(operations).slice(0,12)+(options.changeSetSuffix?'.'+options.changeSetSuffix:'');
  changeSet=validateChangeSet({schemaVersion:1,kind:'atlas-agent-changeset',id,createdAt:options.createdAt,source:'Norsk Daily feed import ('+feed.transform.method+'; no provider call)',
   summary:'Norsk Daily '+feed.studyDate+' ('+feed.source.publisher+', '+feed.coverage.kind+'): '+messages[0],operations});
 }
 return {projection,items,...(qcm?{qcm}:{}),duplicates:projection.duplicates,blocked,messages,...(changeSet?{changeSet}:{})};
}
/** Read-only adapter over the public Agent interface. */
export function lookupFromAgent(api:Pick<AgentInterface,'getResource'>):ResourceLookup{
 return key=>{try{const r=api.getResource(key);return {head:r.head??null,snapshot:r.snapshot as ResourceSnapshot};}catch(e){if(e instanceof Error&&e.message==='Resource unavailable')return undefined;throw e;}};
}
/** Plan + read-only preview. Staging and acceptance remain separate user actions. */
export function previewNorskDailyImport(api:Pick<AgentInterface,'getResource'|'preview'>,input:unknown,options:PlanOptions){
 const plan=planNorskDailyImport(input,lookupFromAgent(api),options);
 return {plan,preview:plan.changeSet?api.preview(plan.changeSet):undefined};
}
