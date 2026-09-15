import {ID} from '../core/validation.mjs';
export const READING_LIMITS=Object.freeze({items:500,bytes:2*1024*1024});
const cats=['informatics','cloud','norsk','job','personal'];
const fail=m=>{throw Error('Invalid reading list: '+m);};
const obj=v=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('object required');};
const text=(v,max)=>{if(typeof v!=='string'||v.length>max)fail('text limit');};
const id=v=>{if(typeof v!=='string'||!ID.test(v))fail('source identifier');};
const keys=(v,allowed)=>{obj(v);for(const k of Object.keys(v))if(!allowed.includes(k))fail('unknown field '+k);};
const integer=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail('integer range');};
export function normaliseReadingUrl(input){
 if(typeof input!=='string'||input.length>2048||/[\u0000-\u0020\u007f]/.test(input.trim()))fail('URL contains spaces or control characters');
 let u;try{u=new URL(input.trim());}catch{fail('Use a complete https:// or http:// address.');}
 if(!['http:','https:'].includes(u.protocol)||!u.hostname||u.username||u.password)fail('Only credential-free HTTP/HTTPS addresses are allowed.');return u.href;
}
function anchor(a){
 keys(a,['blockId','offset','unit','viewportOffset','atStart','pdfPage','pdfRevision','pdfOffset','sheetPage','sheetId']);
 if(a.blockId!==undefined)id(a.blockId);if(a.unit!==undefined)text(a.unit,256);if(a.pdfRevision!==undefined)text(a.pdfRevision,256);
 if(a.sheetId!==undefined)id(a.sheetId);if(a.sheetPage!==undefined)integer(a.sheetPage,1,64);if(a.pdfPage!==undefined)integer(a.pdfPage,1,1000000);if(a.atStart!==undefined&&typeof a.atStart!=='boolean')fail('anchor start');
 for(const k of ['offset','viewportOffset','pdfOffset'])if(a[k]!==undefined&&(!Number.isFinite(a[k])||Math.abs(a[k])>1000000))fail('anchor offset');
 if(a.pdfOffset!==undefined&&(a.pdfOffset < -10||a.pdfOffset>10))fail('PDF offset');
}
export function validateReadingTarget(t){
 obj(t);
 const allowed={'cheatsheet-page':['kind','pageId','documentId','sheetPage','anchor'],url:['kind','url'],page:['kind','pageId','anchor'],collection:['kind','collectionId'],'pdf-page':['kind','pageId','documentId','revision','pdfPage','anchor'],'pdf-category':['kind','pageId','documentId','revision','pdfPage','pdfCategoryId']};
 if(!Object.hasOwn(allowed,t.kind))fail('target kind');keys(t,allowed[t.kind]);
 if(t.kind==='url'){normaliseReadingUrl(t.url);return;}
 if(t.kind==='collection'){id(t.collectionId);return;}
 id(t.pageId);if(t.anchor!==undefined)anchor(t.anchor);if(t.kind==='cheatsheet-page'){id(t.documentId);integer(t.sheetPage,1,64);if(t.anchor?.sheetPage!==undefined&&t.anchor.sheetPage!==t.sheetPage)fail('cheatsheet anchor identity');if(t.anchor?.pdfPage!==undefined||t.anchor?.pdfRevision!==undefined||t.anchor?.pdfOffset!==undefined)fail('PDF anchor on cheatsheet');}
 if(t.kind.startsWith('pdf-')){id(t.documentId);integer(t.pdfPage,1,1000000);if(t.revision!==undefined&&!/^[a-f0-9]{64}$/.test(t.revision))fail('PDF revision');if(t.kind==='pdf-category')id(t.pdfCategoryId);if(t.anchor?.pdfPage!==undefined&&t.anchor.pdfPage!==t.pdfPage)fail('PDF anchor identity');}
}
export function validateBookmarkReading(b){
 if(b.category!==undefined&&b.category!==null&&!cats.includes(b.category))fail('bookmark category');if(b.note!==undefined)text(b.note,1000);
 if(b.target!==undefined){validateReadingTarget(b.target);if(b.target.kind==='url')fail('URL bookmark');if((b.target.kind==='collection'?b.target.collectionId:b.target.pageId)!==b.pageId)fail('bookmark identity');}
}
export function validateReadingLists(entries){
 if(!Array.isArray(entries)||entries.length>READING_LIMITS.items)fail('500-item limit');if(new TextEncoder().encode(JSON.stringify(entries)).length>READING_LIMITS.bytes)fail('2 MiB limit');
 const ids=new Set();for(const e of entries){keys(e,['id','title','note','category','createdAt','target','read']);id(e.id);if(ids.has(e.id))fail('duplicate entry');ids.add(e.id);text(e.title,120);if(!e.title.trim())fail('empty title');text(e.note,1000);if(e.category!==null&&!cats.includes(e.category))fail('category');integer(e.createdAt,0,8640000000000000);if(typeof e.read!=='boolean')fail('read flag');validateReadingTarget(e.target);}
}
