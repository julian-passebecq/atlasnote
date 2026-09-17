import type {Catalogue,Personal,Workspace,Block} from '../core/model.js';
import type {ResourceTarget} from '../core/reading-types.js';
import type {Concept,KnowledgeState,ReferenceEdge} from './model.js';
import {validateKnowledge,KNOWLEDGE_LIMITS} from './validation.mjs';
import {targetKey,targetScopeKeys,documentTarget,canonicalTarget,resolveTarget,requireExact,resourceTargets} from './targets.js';
import type {ResolvedTarget} from './targets.js';
import {walkBlocks} from '../core/validation.mjs';
import {uid} from '../core/workspace.js';
import {targetForPage} from '../core/reading-lists.js';
import {SUBJECTS} from '../content-hub/model.js';
export function emptyKnowledge():KnowledgeState {return {schemaVersion:1,revision:0,concepts:SUBJECTS.map(s=>({id:'concept.'+s.id,subject:s.id,label:s.label,aliases:[],relatedConceptIds:[],createdAt:0,updatedAt:0})),assignments:[],edges:[],reviews:[],proposals:[],audit:[]};}
export function knowledgeOf(p:Personal):KnowledgeState{return p.knowledge??emptyKnowledge();}
/** Clone/validate/commit: invalid operations never partially mutate personal data. */
export function changeKnowledge(p:Personal,action:string,ids:string[],apply:(k:KnowledgeState)=>void,now=Date.now()):KnowledgeState {
 const next=structuredClone(knowledgeOf(p));apply(next);next.revision++;
 next.audit=[...next.audit,{id:uid('audit.reference'),revision:next.revision,action,at:now,ids:[...new Set(ids)].slice(0,200)}].slice(-KNOWLEDGE_LIMITS.audit);
 validateKnowledge(next);p.knowledge=next;return next;
}
export function saveConcept(p:Personal,input:Omit<Concept,'createdAt'|'updatedAt'>,now=Date.now()){
 return changeKnowledge(p,'Save concept',[input.id],k=>{
  const old=k.concepts.find(c=>c.id===input.id);const concept={...structuredClone(input),label:input.label.trim(),aliases:[...new Set(input.aliases.map(a=>a.trim()).filter(Boolean))],createdAt:old?.createdAt??now,updatedAt:now};
  if(old)k.concepts[k.concepts.indexOf(old)]=concept;else k.concepts.push(concept);
 },now);
}
export function deprecateConcept(p:Personal,id:string,replacement?:string,now=Date.now()){
 return changeKnowledge(p,'Deprecate concept',[id,...(replacement?[replacement]:[])],k=>{const c=k.concepts.find(c=>c.id===id);if(!c)throw Error('Concept not found.');if(replacement&&!k.concepts.some(c=>c.id===replacement&&!c.deprecated))throw Error('Choose an active replacement.');c.deprecated=true;c.updatedAt=now;if(replacement)c.replacedById=replacement;else delete c.replacedById;},now);
}
export function removeConcept(p:Personal,id:string){
 return changeKnowledge(p,'Remove unlinked concept',[id],k=>{if(id.startsWith('concept.')&&SUBJECTS.some(s=>'concept.'+s.id===id))throw Error('Subject roots cannot be removed.');
  if(k.assignments.some(a=>a.conceptId===id)||k.proposals.some(a=>a.conceptId===id)||k.concepts.some(c=>c.primaryParentId===id||c.replacedById===id||c.relatedConceptIds.includes(id)))throw Error('This concept is referenced. Deprecate it or explicitly reassign its links first.');
  k.concepts=k.concepts.filter(c=>c.id!==id);
 });
}
export function effectiveConcept(k:KnowledgeState,id:string):string {const seen=new Set<string>();let c=k.concepts.find(c=>c.id===id);while(c?.replacedById&&!seen.has(c.id)){seen.add(c.id);c=k.concepts.find(x=>x.id===c!.replacedById);}return c?.id??id;}
export function assignConcept(p:Personal,c:Catalogue,ws:Workspace,conceptId:string,target:ResourceTarget,note='',now=Date.now()){
 const resource=requireExact(c,ws,target),concept=knowledgeOf(p).concepts.find(x=>x.id===conceptId);if(!concept||concept.deprecated)throw Error('Choose an active concept.');
 return changeKnowledge(p,'Link concept',[conceptId],k=>{
  const key=targetKey(c,target),old=k.assignments.find(a=>a.conceptId===conceptId&&targetKey(c,a.target)===key);
  if(old){old.targetRevision=resource.revision;old.note=note;}else k.assignments.push({id:uid('assignment'),conceptId,target:structuredClone(target),targetRevision:resource.revision,note,createdAt:now});
 },now);
}
export function unassignConcept(p:Personal,id:string){changeKnowledge(p,'Unlink concept assignment',[id],k=>{k.assignments=k.assignments.filter(a=>a.id!==id);});}
export function linkReference(p:Personal,c:Catalogue,ws:Workspace,source:ResourceTarget,target:ResourceTarget,kind:ReferenceEdge['kind']='link',label='',note='',now=Date.now()){
 const from=requireExact(c,ws,source),to=requireExact(c,ws,target);if(from.key===to.key)throw Error('Choose a different exact target.');
 return changeKnowledge(p,'Add reference',[],k=>{const old=k.edges.find(e=>targetKey(c,e.source)===from.key&&targetKey(c,e.target)===to.key&&e.kind===kind);const values={source:structuredClone(source),target:structuredClone(target),sourceRevision:from.revision,targetRevision:to.revision,kind,label,note};if(old)Object.assign(old,values);else k.edges.push({id:uid('edge'),...values,createdAt:now});},now);
}
export function unlinkReference(p:Personal,id:string){changeKnowledge(p,'Remove explicit reference',[id],k=>{k.edges=k.edges.filter(e=>e.id!==id);});}
export function markReviewed(p:Personal,c:Catalogue,ws:Workspace,target:ResourceTarget,now=Date.now()){
 const r=requireExact(c,ws,target);changeKnowledge(p,'Review resource',[],k=>{k.reviews=k.reviews.filter(x=>targetKey(c,x.target)!==r.key);k.reviews.push({target:structuredClone(target),revision:r.revision,reviewedAt:now});},now);
}
export type IndexedEdge={id:string;source:ResourceTarget;target:ResourceTarget;label:string;provenance:string;kind:string;sourceRevision?:string;targetRevision?:string};
export type ReferenceIndex={knowledge:KnowledgeState;documentScopes:Map<string,Set<string>>;bySource:Map<string,IndexedEdge[]>;byTarget:Map<string,IndexedEdge[]>;assignments:Map<string,KnowledgeState['assignments']>;byConcept:Map<string,KnowledgeState['assignments']>};
/** One derived index; backlinks are never stored as a second competing truth. */
export function createReferenceIndex(c:Catalogue,ws:Workspace):ReferenceIndex {
 const documentScopes=new Map<string,Set<string>>();
 const track=(t:ResourceTarget)=>{const root=targetKey(c,documentTarget(c,t)),keys=documentScopes.get(root)??new Set<string>();keys.add(targetKey(c,t));documentScopes.set(root,keys);};
 const k=knowledgeOf(ws.personal),bySource=new Map<string,IndexedEdge[]>(),byTarget=new Map<string,IndexedEdge[]>(),assignments=new Map<string,KnowledgeState['assignments']>(),byConcept=new Map<string,KnowledgeState['assignments']>();
 const put=<T,>(map:Map<string,T[]>,key:string,row:T)=>{const rows=map.get(key)??[];rows.push(row);map.set(key,rows);};
 const add=(e:IndexedEdge)=>{track(e.source);track(e.target);put(bySource,targetKey(c,e.source),e);put(byTarget,targetKey(c,e.target),e);};
 for(const e of k.edges)add({...e,label:e.label??'',provenance:'Explicit '+e.kind});
 for(const page of c.pages){
  const source=targetForPage(c,page.id);for(const [i,id]of page.related.entries())add({id:page.id+'.related.'+i,source,target:{kind:'page',pageId:id},label:'Related document',provenance:'Existing document relationship',kind:'related'});
  for(const [i,r]of (page.resourceLinks??[]).entries())add({id:page.id+'.link.'+i,source,target:r.target,label:r.label,provenance:'Existing typed relationship',kind:'link'});
  walkBlocks(page.blocks,(b:Block)=>{if(b.type==='resource-link'||b.type==='link')add({id:b.id,source:targetForPage(c,page.id,{blockId:b.id}),target:b.type==='resource-link'?b.target:{kind:'page',pageId:b.pageId},label:b.label??'',provenance:'Notebook inline reference',kind:'link'});});
  for(const q of page.qcm?.questions??[])for(const [i,r]of (q.links??[]).entries())add({id:q.id+'.link.'+i,source:{kind:'qcm',setId:page.qcm!.id,pageId:page.id,questionId:q.id},target:r.target,label:r.label,provenance:'Question reference',kind:'link'});
  if(page.article?.contextTarget)add({id:page.article.id+'.capture',source,target:page.article.contextTarget,label:'Captured from here',provenance:'Article capture context',kind:'context'});
 }
 for(const item of ws.personal.dashboardItems??[])if(item.contextTarget&&item.status!=='archived')add({id:item.id,source:{kind:'dashboard-item',itemId:item.id},target:item.contextTarget,label:item.text,provenance:'Opt-in capture context',kind:'context'});
 for(const a of k.assignments){track(a.target);put(assignments,targetKey(c,a.target),a);put(byConcept,effectiveConcept(k,a.conceptId),a);}
 return {knowledge:k,documentScopes,bySource,byTarget,assignments,byConcept};
}
export type ReferenceDirection='outgoing'|'incoming'|'related';
export type ReferenceRow=ResolvedTarget&{directions:ReferenceDirection[];reasons:string[];stale:boolean};
export function queryReferences(c:Catalogue,ws:Workspace,index:ReferenceIndex,target?:ResourceTarget,conceptId?:string,limit=200){
 const rows=new Map<string,ReferenceRow>(),own=target?targetKey(c,target):'',scopes=target?targetScopeKeys(c,target):[];
 const canonical=target?canonicalTarget(c,target):undefined;const whole=!!canonical&&((canonical.kind==='page'||canonical.kind==='article')&&!canonical.anchor?.blockId||canonical.kind==='qcm'&&!canonical.questionId);
 if(whole)for(const key of index.documentScopes.get(own)??[])if(!scopes.includes(key))scopes.push(key);
 const assignments=scopes.flatMap(key=>index.assignments.get(key)??[]),conceptIds=new Set(conceptId?[effectiveConcept(index.knowledge,conceptId)]:assignments.map(a=>effectiveConcept(index.knowledge,a.conceptId)));
 const add=(to:ResourceTarget,direction:ReferenceDirection,reason:string,revision?:string)=>{
  const resolved=resolveTarget(c,ws,to);if(resolved.key===own)return;const old=rows.get(resolved.key),stale=!!revision&&resolved.revision!==revision;
  if(old){if(!old.directions.includes(direction))old.directions.push(direction);if(!old.reasons.includes(reason))old.reasons.push(reason);old.stale||=stale;return;}
  rows.set(resolved.key,{...resolved,directions:[direction],reasons:[reason],stale});
 };
 for(const key of scopes){const broad=key!==own?(whole?' (section/page within this document)':' (broader document/page scope)'):'';
  for(const e of index.bySource.get(key)??[])add(e.target,'outgoing',e.provenance+broad+(e.label?' / '+e.label:''),e.targetRevision);
  for(const e of index.byTarget.get(key)??[])add(e.source,'incoming',e.provenance+broad+(e.label?' / '+e.label:''),e.sourceRevision);
 }
 for(const id of conceptIds){const label=index.knowledge.concepts.find(c=>c.id===id)?.label??id;for(const a of index.byConcept.get(id)??[])add(a.target,'related','Shared concept / '+label,a.targetRevision);}
 return {concepts:[...conceptIds].map(id=>index.knowledge.concepts.find(c=>c.id===id)!).filter(Boolean),assignments,rows:[...rows.values()].sort((a,b)=>a.group.localeCompare(b.group)||a.title.localeCompare(b.title)||a.detail.localeCompare(b.detail)).slice(0,limit),total:rows.size};
}
export function reviewQueue(c:Catalogue,ws:Workspace,index=createReferenceIndex(c,ws)){
 return resourceTargets(c,ws).map(target=>{const r=resolveTarget(c,ws,target),assigned=index.assignments.get(r.key)??[],review=index.knowledge.reviews.find(x=>targetKey(c,x.target)===r.key),linked=assigned.length>0||(index.bySource.get(r.key)?.length??0)>0;
  const outdated=assigned.some(a=>a.targetRevision!==r.revision)||!!review&&review.revision!==r.revision||(index.bySource.get(r.key)??[]).some(e=>e.sourceRevision&&e.sourceRevision!==r.revision);
  return {...r,status:outdated?'changed':!review&&!linked?'unlinked':!review?'needs-review':'reviewed'};
 }).filter(r=>r.available&&r.exact&&r.status!=='reviewed');
}
