import {inspectObject,ID} from '../core/validation.mjs';
export const COMPANION_LIMITS={bytes:2*1024*1024,pages:10000,terms:2000,categories:500,depth:8};
export const companionKey=(doc)=>doc.id+'@'+(doc.sha256||'unversioned');
/** A companion is untrusted study data, never code, HTML, a URL fetch or an
 * instruction to the app. Unknown fields are rejected instead of executed. */
export function validateCompanion(value,doc){
 const fail=m=>{throw Error('Invalid PDF companion: '+m);};
 if(typeof value==='string'){if(new TextEncoder().encode(value).length>COMPANION_LIMITS.bytes)fail('payload exceeds 2 MiB');try{value=JSON.parse(value);}catch{fail('not JSON');}}
 inspectObject(value);if(new TextEncoder().encode(JSON.stringify(value)).length>COMPANION_LIMITS.bytes)fail('payload exceeds 2 MiB');
 const obj=(x,fields,name)=>{if(!x||typeof x!=='object'||Array.isArray(x))fail(name);for(const key of Object.keys(x))if(!fields.includes(key))fail('unknown '+name+' field '+key);};
 const str=(x,name,max=10000)=>{if(typeof x!=='string'||x.length>max)fail(name);};
 const id=(x,name)=>{str(x,name,180);if(!ID.test(x))fail(name);};
 const arr=(x,name,max)=>{if(!Array.isArray(x)||x.length>max)fail(name);};
 obj(value,['schemaVersion','id','documentId','documentSha256','pageCount','title','generatedBy','createdAt','reviewed','categories','pages','terms'],'companion');
 if(value.schemaVersion!==1)fail('unsupported schema');id(value.id,'ID');id(value.documentId,'document ID');
 if(doc&&value.documentId!==doc.id)fail('document ID mismatch');
 if(value.documentSha256!==undefined&&!/^[a-f0-9]{64}$/.test(value.documentSha256))fail('revision hash');
 if(doc?.sha256&&value.documentSha256!==doc.sha256)fail('PDF revision mismatch; regenerate or explicitly review against this revision');
 if(!Number.isInteger(value.pageCount)||value.pageCount<1||value.pageCount>COMPANION_LIMITS.pages)fail('page count');
 if(doc?.pageCount&&value.pageCount!==doc.pageCount)fail('physical page count mismatch');
 str(value.title,'title',240);if(!Number.isFinite(value.createdAt)||value.createdAt<0)fail('creation timestamp');
 if(value.generatedBy!==undefined&&!['ai','manual'].includes(value.generatedBy))fail('author type');
 if(value.reviewed!==undefined&&typeof value.reviewed!=='boolean')fail('review flag');
 const page=(n)=>{if(!Number.isInteger(n)||n<1||n>value.pageCount)fail('physical page out of range');};
 const refs=(ns,name,max=10000)=>{arr(ns,name,max);ns.forEach(page);if(new Set(ns).size!==ns.length)fail('duplicate '+name);};
 const cats=new Set(),terms=new Set();let count=0;
 const walk=(ns,depth)=>{arr(ns,'categories',500);if(depth>8)fail('category nesting');for(const c of ns){
  if(++count>500)fail('too many categories');obj(c,['id','title','pageRefs','pageRanges','children'],'category');id(c.id,'category ID');if(cats.has(c.id))fail('duplicate category ID');cats.add(c.id);str(c.title,'category title',240);
  if(c.pageRefs)refs(c.pageRefs,'category pages');if(c.pageRanges){arr(c.pageRanges,'ranges',1000);for(const r of c.pageRanges){arr(r,'range',2);if(r.length!==2)fail('range');r.forEach(page);if(r[0]>r[1])fail('reversed range');}}
  if(c.children)walk(c.children,depth+1);
 }};walk(value.categories,0);arr(value.terms,'terms',2000);
 const categoryRefs=(ns)=>{if(ns!==undefined){arr(ns,'category references',500);for(const n of ns)if(!cats.has(n))fail('unresolved category '+n);}};
 for(const t of value.terms){obj(t,['id','label','definition','aliases','translation','example','importance','pageRefs','categoryIds','globalTermId'],'term');id(t.id,'term ID');if(terms.has(t.id))fail('duplicate term ID');terms.add(t.id);str(t.label,'term label',240);str(t.definition,'definition',10000);
  for(const k of ['translation','example'])if(t[k]!==undefined)str(t[k],k,10000);
  if(t.aliases){arr(t.aliases,'aliases',50);t.aliases.forEach(x=>str(x,'alias',240));}if(t.globalTermId!==undefined)id(t.globalTermId,'global term ID');
  if(t.importance&&!['core','supporting','detail'].includes(t.importance))fail('importance');refs(t.pageRefs,'term occurrences');categoryRefs(t.categoryIds);
 }
 if(!value.pages||typeof value.pages!=='object'||Array.isArray(value.pages))fail('pages');if(Object.keys(value.pages).length>COMPANION_LIMITS.pages)fail('too many pages');
 for(const [key,p] of Object.entries(value.pages)){obj(p,['page','title','summary','keyPoints','categoryIds','termIds'],'page');page(p.page);if(key!==String(p.page))fail('page key mismatch');if(p.title!==undefined)str(p.title,'page title',240);if(p.summary!==undefined)str(p.summary,'page summary');
  if(p.keyPoints){arr(p.keyPoints,'key points',30);p.keyPoints.forEach(x=>str(x,'key point',2000));}categoryRefs(p.categoryIds);
  if(p.termIds){arr(p.termIds,'term references',2000);for(const t of p.termIds)if(!terms.has(t))fail('unresolved term '+t);}
 }
 return structuredClone(value);
}
export function categoryContains(category,page){return !!category.pageRefs?.includes(page)||!!category.pageRanges?.some(([a,b])=>page>=a&&page<=b)||!!category.children?.some(c=>categoryContains(c,page));}
export function categoryFirstPage(category){return Math.min(...(category.pageRefs??[]),...(category.pageRanges??[]).map(r=>r[0]),...(category.children??[]).map(categoryFirstPage));}
export function pageTerms(companion,page){const ids=new Set(companion.pages[String(page)]?.termIds??[]);return companion.terms.filter(t=>t.pageRefs.includes(page)||ids.has(t.id));}
export function pageWindow(page,count,size=40){const first=Math.floor((page-1)/size)*size+1;return Array.from({length:Math.min(size,count-first+1)},(_,i)=>i+first);}
