import {inspectObject,ID} from '../core/validation.mjs';
import {validateReadingTarget} from '../storage/reading-validation.mjs';
export const KNOWLEDGE_LIMITS=Object.freeze({concepts:2000,assignments:20000,edges:20000,proposals:1000,reviews:10000,audit:200,bytes:12*1024*1024,reviewItems:50,suggestions:100});
const fail=m=>{throw Error('Invalid reference data: '+m);};
const obj=v=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('object required');};
const keys=(v,allowed)=>{obj(v);for(const k of Object.keys(v))if(!allowed.includes(k))fail('unknown field '+k);};
const text=(v,max=1000)=>{if(typeof v!=='string'||v.length>max)fail('text limit');};
const id=v=>{if(typeof v!=='string'||!ID.test(v))fail('identifier');};
const time=v=>{if(!Number.isSafeInteger(v)||v<0||v>8640000000000000)fail('timestamp/revision');};
const list=(v,max)=>{if(!Array.isArray(v)||v.length>max)fail('list limit');};
const ids=(v,max)=>{list(v,max);v.forEach(id);if(new Set(v).size!==v.length)fail('duplicate ID');};
const unique=values=>{const seen=new Set();for(const v of values){id(v.id);if(seen.has(v.id))fail('duplicate identifier '+v.id);seen.add(v.id);}};
const revision=v=>{text(v,100);if(!/^[a-f0-9]{16}$/.test(v))fail('source revision');};
export function validateSuggestion(v){
 keys(v,['id','type','conceptId','source','target','sourceRevision','targetRevision','kind','reason','confidence','note']);id(v.id);
 if(!['assignment','reference'].includes(v.type))fail('suggestion type');validateReadingTarget(v.target);revision(v.targetRevision);text(v.reason,2000);
 if(v.confidence!==undefined&&(!Number.isFinite(v.confidence)||v.confidence<0||v.confidence>1))fail('confidence');if(v.note!==undefined)text(v.note,2000);
 if(v.type==='assignment'){id(v.conceptId);if(v.source!==undefined||v.kind!==undefined||v.sourceRevision!==undefined)fail('assignment fields');}
 else {validateReadingTarget(v.source);revision(v.sourceRevision);if(!['link','context','related'].includes(v.kind))fail('edge kind');if(v.conceptId!==undefined)fail('reference concept');}
}
export function validateSuggestionBatch(v){inspectObject(v);keys(v,['schemaVersion','kind','semanticRevision','suggestions']);if(v.schemaVersion!==1||v.kind!=='atlas-reference-suggestions')fail('suggestion schema');time(v.semanticRevision);list(v.suggestions,KNOWLEDGE_LIMITS.suggestions);if(!v.suggestions.length)fail('empty suggestion batch');unique(v.suggestions);v.suggestions.forEach(validateSuggestion);return true;}
export function validateKnowledge(v){
 if(v===undefined)return true;
 inspectObject(v);keys(v,['schemaVersion','revision','concepts','assignments','edges','reviews','proposals','audit']);
 if(v.schemaVersion!==1)fail('schema version');time(v.revision);
 if(new TextEncoder().encode(JSON.stringify(v)).length>KNOWLEDGE_LIMITS.bytes)fail('12 MiB limit');
 for(const k of ['concepts','assignments','edges','reviews','proposals','audit'])list(v[k],KNOWLEDGE_LIMITS[k]);
 unique(v.concepts);unique(v.assignments);unique(v.edges);unique(v.proposals);unique(v.audit);
 const concepts=new Map(v.concepts.map(c=>[c.id,c]));
 for(const c of v.concepts){
  keys(c,['id','subject','label','aliases','primaryParentId','relatedConceptIds','deprecated','replacedById','createdAt','updatedAt']);
  if(!['it','cloud','job','kpi','norsk'].includes(c.subject))fail('subject');text(c.label,160);if(!c.label.trim())fail('empty concept label');list(c.aliases,30);c.aliases.forEach(x=>text(x,160));ids(c.relatedConceptIds,100);time(c.createdAt);time(c.updatedAt);if(c.updatedAt<c.createdAt)fail('concept chronology');
  if(c.deprecated!==undefined&&typeof c.deprecated!=='boolean')fail('deprecated flag');
  if(c.primaryParentId!==undefined){id(c.primaryParentId);const parent=concepts.get(c.primaryParentId);if(!parent||parent.id===c.id||parent.subject!==c.subject)fail('parent/subject');}
  for(const r of c.relatedConceptIds)if(!concepts.has(r)||r===c.id)fail('related concept');
  if(c.replacedById!==undefined){id(c.replacedById);if(!c.deprecated||!concepts.has(c.replacedById)||c.replacedById===c.id)fail('replacement');}
  for(const field of ['primaryParentId','replacedById']){let next=c;const seen=new Set();while(next){if(seen.has(next.id))fail('concept cycle');seen.add(next.id);next=concepts.get(next[field]);}}
 }
 for(const a of v.assignments){keys(a,['id','conceptId','target','targetRevision','note','createdAt']);if(!concepts.has(a.conceptId))fail('unknown assigned concept');validateReadingTarget(a.target);revision(a.targetRevision);if(a.note!==undefined)text(a.note,2000);time(a.createdAt);}
 for(const e of v.edges){keys(e,['id','source','target','sourceRevision','targetRevision','kind','label','note','createdAt']);validateReadingTarget(e.source);validateReadingTarget(e.target);revision(e.sourceRevision);revision(e.targetRevision);if(!['link','context','related'].includes(e.kind))fail('reference kind');if(e.label!==undefined)text(e.label,200);if(e.note!==undefined)text(e.note,2000);time(e.createdAt);}
 for(const r of v.reviews){keys(r,['target','revision','reviewedAt']);validateReadingTarget(r.target);revision(r.revision);time(r.reviewedAt);}
 for(const p of v.proposals){keys(p,['id','type','conceptId','source','target','sourceRevision','targetRevision','kind','reason','confidence','note','batchId','semanticRevision','status','importedAt','reviewedAt']);const {batchId,semanticRevision,status,importedAt,reviewedAt,...s}=p;validateSuggestion(s);id(batchId);time(semanticRevision);time(importedAt);if(reviewedAt!==undefined)time(reviewedAt);if(!['proposed','accepted','rejected','stale'].includes(status))fail('proposal status');if(p.conceptId&&!concepts.has(p.conceptId))fail('proposal concept');}
 for(const e of v.audit){keys(e,['id','revision','action','at','ids']);time(e.revision);if(e.revision>v.revision)fail('audit revision');text(e.action,200);time(e.at);ids(e.ids,200);}
 return true;
}
export function validateExplorer(v){if(v===undefined)return;keys(v,['target','conceptId','returnViewId']);if(v.target!==undefined)validateReadingTarget(v.target);if(v.conceptId!==undefined)id(v.conceptId);if(v.returnViewId!==undefined)id(v.returnViewId);}
