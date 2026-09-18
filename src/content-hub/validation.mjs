/** Additive, bounded data contracts. Validation never strips or coerces source data. */
import {ID,inspectObject} from '../core/validation.mjs';
import {validateReadingTarget,normaliseReadingUrl} from '../storage/reading-validation.mjs';
export const HUB_LIMITS=Object.freeze({bytes:4*1024*1024,questions:500,items:2000,attempts:10000,references:2000});
const fail=m=>{throw Error('Invalid content data: '+m);};
const object=(v,n)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail(n+' must be an object');};
const keys=(v,allowed,n)=>{object(v,n);for(const k of Object.keys(v))if(!allowed.includes(k))fail(n+': unknown field '+k);};
const id=(v,n)=>{if(typeof v!=='string'||!ID.test(v))fail(n+' must be a stable identifier');};
const text=(v,n,max=10000,min=0)=>{if(typeof v!=='string'||v.length>max||v.trim().length<min)fail(n+' text limit');};
const array=(v,n,max,min=0)=>{if(!Array.isArray(v)||v.length>max||v.length<min)fail(n+' count');};
const integer=(v,n,min=0,max=8640000000000000)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail(n+' range');};
const bool=(v,n)=>{if(typeof v!=='boolean')fail(n+' must be boolean');};
const choice=(v,values,n)=>{if(!values.includes(v))fail(n+' value');};
const optional=(v,key,check)=>{if(v[key]!==undefined)check(v[key],key);};
const unique=(values,n)=>{if(new Set(values).size!==values.length)fail(n+' must be unique');};
export function boundedContent(v){function plain(x,depth=0){if(depth>100)fail('content depth');if(x&&typeof x==='object'){const proto=Object.getPrototypeOf(x);if(!Array.isArray(x)&&proto!==Object.prototype&&proto!==null)fail('Plain JSON objects required');for(const v of Object.values(x))plain(v,depth+1);}}plain(v);inspectObject(v);if(new TextEncoder().encode(JSON.stringify(v)).length>HUB_LIMITS.bytes)fail('4 MiB source limit');return v;}
export function parseContentJSON(source){if(typeof source!=='string'||new TextEncoder().encode(source).length>HUB_LIMITS.bytes)fail('4 MiB source limit');let value;try{value=JSON.parse(source);}catch{fail('Malformed JSON');}return boundedContent(value);}
export function validateTaxonomy(t){keys(t,['subject','folderId','path'],'taxonomy');choice(t.subject,['it','cloud','job','kpi','norsk'],'subject');optional(t,'folderId',id);if(t.path!==undefined){array(t.path,'path',60);t.path.forEach(p=>text(p,'path',200,1));}return t;}
function links(v){array(v,'links',50);for(const l of v){keys(l,['label','target'],'link');text(l.label,'label',160,1);validateReadingTarget(l.target);}}
export function validateArticle(meta){keys(meta,['id','title','url','publisher','sourceType','taxonomy','status','important','note','addedAt','updatedAt','contextTarget'],'article');id(meta.id,'article ID');text(meta.title,'article title',200,1);integer(meta.addedAt,'addedAt');optional(meta,'updatedAt',integer);optional(meta,'url',normaliseReadingUrl);optional(meta,'publisher',(v)=>text(v,'publisher',200));optional(meta,'note',(v)=>text(v,'note',10000));optional(meta,'sourceType',v=>choice(v,['link','article','transcript','documentation'],'source type'));optional(meta,'status',v=>choice(v,['inbox','unread','reading','finished'],'article status'));optional(meta,'important',bool);optional(meta,'taxonomy',validateTaxonomy);optional(meta,'contextTarget',validateReadingTarget);if(meta.sourceType==='link'&&!meta.url)fail('A link-only article needs a URL');return meta;}
/** Pasted text may contain markup as literal text. It is never parsed as remote HTML. */
export function validateArticleSource(value,now=Date.now()){
 boundedContent(value);keys(value,['id','title','url','publisher','sourceType','taxonomy','status','important','note','addedAt','updatedAt','contextTarget','text','blocks'],'article source');
 const {text:body,blocks,...meta}=value;validateArticle({...meta,addedAt:meta.addedAt??now});if(body!==undefined)text(body,'article text',1000000);if(blocks!==undefined){array(blocks,'article blocks',1000);validateSafeArticleBlocks(blocks);}
 if(body!==undefined&&blocks!==undefined)fail('Choose text or blocks, not both');return value;
}
export function validateSafeArticleBlocks(blocks){
 const ids=new Set();function visit(bs,depth=0){if(depth>30)fail('article depth');array(bs,'article blocks',1000);for(const b of bs){object(b,'block');id(b.id,'block ID');if(ids.has(b.id))fail('duplicate article block');ids.add(b.id);
 const fields={markdown:['text'],section:['title','children','collapsed'],callout:['title','text','tone'],list:['items','ordered'],table:['columns','rows'],code:['language','code','title','explanation','output'],bilingual:['no','en','hint'],'resource-link':['label','description','target'],separator:[],page_break:[]};
 if(!Object.hasOwn(fields,b.type))fail('Unsupported pasted article block '+b.type);keys(b,['id','type','layout',...fields[b.type]],'article block');
 if(b.layout!==undefined){keys(b.layout,['keepWithNext','avoidBreakInside','pageBreakBefore','preferredSize'],'layout');for(const k of ['keepWithNext','avoidBreakInside','pageBreakBefore'])optional(b.layout,k,bool);optional(b.layout,'preferredSize',v=>choice(v,['compact','normal','large','full-page'],'preferredSize'));}optional(b,'ordered',bool);optional(b,'collapsed',bool);
 for(const k of ['text','title','code','language','no','en','hint','explanation','output','label','description'])optional(b,k,(v)=>text(v,k,1000000));
 if(b.type==='markdown')text(b.text,'markdown',1000000);if(b.type==='section'){text(b.title,'section',200);visit(b.children,depth+1);}if(b.type==='resource-link'){text(b.label,'link label',200,1);validateReadingTarget(b.target);}
 if(b.type==='code'){text(b.code,'code',1000000);text(b.language,'language',100);}if(b.type==='bilingual'){text(b.no,'Norwegian',1000000);text(b.en,'English',1000000);}
 if(b.type==='callout'){text(b.title,'title',200);text(b.text,'text',1000000);optional(b,'tone',v=>choice(v,['info','warning'],'tone'));}
 for(const k of ['items','columns'])if(b[k]!==undefined){array(b[k],k,1000);b[k].forEach(v=>text(v,k,10000));}if(b.type==='list'&&!Array.isArray(b.items))fail('list items');if(b.type==='table'){array(b.columns,'columns',20,1);array(b.rows,'rows',1000);for(const row of b.rows){array(row,'cells',20);if(row.length!==b.columns.length)fail('table row width');row.forEach(v=>text(v,'cell',10000));}}
 }}visit(blocks);
}
export function validateQcm(doc){boundedContent(doc);keys(doc,['schemaVersion','id','title','taxonomy','questions'],'QCM');if(doc.schemaVersion!==1)fail('QCM schemaVersion');id(doc.id,'set ID');text(doc.title,'set title',200,1);optional(doc,'taxonomy',validateTaxonomy);array(doc.questions,'questions',HUB_LIMITS.questions,1);unique(doc.questions.map(q=>q.id),'questions');
 for(const q of doc.questions){keys(q,['id','prompt','options','correctOptionIds','explanation','followUp','tags','links'],'question');id(q.id,'question ID');text(q.prompt,'prompt',20000,1);array(q.options,'options',6,2);unique(q.options.map(o=>o.id),'options');for(const o of q.options){keys(o,['id','text','explanation'],'option');id(o.id,'option ID');text(o.text,'option text',10000,1);optional(o,'explanation',text);}array(q.correctOptionIds,'correct answers',q.options.length,1);unique(q.correctOptionIds,'correct answers');for(const a of q.correctOptionIds)if(!q.options.some(o=>o.id===a))fail('Correct answer does not exist');optional(q,'explanation',text);optional(q,'followUp',text);if(q.tags!==undefined){array(q.tags,'tags',50);q.tags.forEach(t=>text(t,'tag',100,1));}optional(q,'links',links);}
 return doc;
}
export function validateHubPage(page){
 optional(page,'resourceLinks',links);
 if(page.kind==='article'){if(!page.article||page.qcm||page.cheatsheet)fail('article wrapper');validateArticle(page.article);if(page.article.id!==page.id||page.article.title!==page.title)fail('article wrapper identity');validateSafeArticleBlocks(page.blocks);}
 else if(page.kind==='qcm'){if(!page.qcm||page.article||page.cheatsheet||page.blocks.length)fail('QCM wrapper');validateQcm(page.qcm);if(page.qcm.id!==page.id||page.qcm.title!==page.title)fail('QCM wrapper identity');}
 else if(page.article!==undefined||page.qcm!==undefined)fail('content metadata requires its matching kind');
 function walk(blocks){for(const b of blocks){if(b.type==='resource-link'){text(b.label,'resource link label',200,1);validateReadingTarget(b.target);}if(b.type==='section')walk(b.children);}}walk(page.blocks??[]);
}
export function validateHubPersonal(p){
 if(p.dashboardItems!==undefined){array(p.dashboardItems,'Dashboard items',HUB_LIMITS.items);unique(p.dashboardItems.map(x=>x.id),'Dashboard IDs');for(const item of p.dashboardItems){keys(item,['id','kind','text','url','dueAt','important','status','taxonomy','contextTarget','createdAt','updatedAt'],'capture');id(item.id,'capture ID');choice(item.kind,['link','task','note','article-draft'],'capture kind');text(item.text,'capture text',20000,1);integer(item.createdAt,'createdAt');optional(item,'updatedAt',integer);optional(item,'dueAt',integer);optional(item,'important',bool);optional(item,'url',normaliseReadingUrl);if(item.kind==='link'&&!item.url)fail('Link capture needs a URL');optional(item,'status',v=>choice(v,['inbox','open','done','archived'],'capture status'));optional(item,'taxonomy',validateTaxonomy);optional(item,'contextTarget',validateReadingTarget);}}
 if(p.qcmAttempts!==undefined){array(p.qcmAttempts,'attempts',HUB_LIMITS.attempts);unique(p.qcmAttempts.map(x=>x.id),'attempt IDs');const numbers=new Set();for(const a of p.qcmAttempts){keys(a,['id','setId','questionId','selectedOptionIds','correct','answeredAt','attemptNumber','reflection','revealed'],'attempt');for(const k of ['id','setId','questionId'])id(a[k],k);array(a.selectedOptionIds,'selected options',6);unique(a.selectedOptionIds,'selected options');a.selectedOptionIds.forEach(v=>id(v,'selected option'));bool(a.correct,'correct');integer(a.answeredAt,'answeredAt');integer(a.attemptNumber,'attempt number',1,1000000);optional(a,'reflection',v=>text(v,'reflection',5000));optional(a,'revealed',bool);if(a.revealed&&a.correct)fail('Revealed answer cannot be marked correct');const key=a.setId+'/'+a.questionId+'/'+a.attemptNumber;if(numbers.has(key))fail('duplicate attempt number');numbers.add(key);}}
 if(p.qcmResponses!==undefined){array(p.qcmResponses,'QCM responses',2000);unique(p.qcmResponses.map(r=>r.setId+'/'+r.questionId),'responses');for(const r of p.qcmResponses){keys(r,['setId','questionId','selectedOptionIds','reflection','updatedAt'],'response');id(r.setId,'set');id(r.questionId,'question');array(r.selectedOptionIds,'selection',6);unique(r.selectedOptionIds,'selection');r.selectedOptionIds.forEach(v=>id(v,'option'));text(r.reflection,'reflection',5000);integer(r.updatedAt,'updatedAt');}}
}
export function validateHubOverlays(o){
 if(o.taxonomy!==undefined){object(o.taxonomy,'assignments');if(Object.keys(o.taxonomy).length>5000)fail('taxonomy assignment limit');for(const [key,t]of Object.entries(o.taxonomy)){id(key,'assigned page');if(t!==null)validateTaxonomy(t);}}
 if(o.references!==undefined){array(o.references,'Notebook references',HUB_LIMITS.references);unique(o.references.map(r=>r.id),'reference IDs');for(const r of o.references){keys(r,['id','title','target','taxonomy','createdAt'],'Notebook reference');id(r.id,'reference ID');text(r.title,'reference title',200,1);validateReadingTarget(r.target);validateTaxonomy(r.taxonomy);integer(r.createdAt,'createdAt');}}
}
