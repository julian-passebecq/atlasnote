/** Build-only ingestion of a reviewed metadata manifest. No network, no PDF copying.
 * config/pdfatlas.json is the single commit-pinning point. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readWorkspace,loadSchemas} from '../src/core/packs.mjs';
import {readFiles} from './fs.mjs';
const ID=/^[A-Za-z][A-Za-z0-9._-]{0,199}$/;
export function validateManifest(m,base){
 const fail=s=>{throw Error('Invalid PDF Atlas manifest: '+s);};
 if(m?.format!=='atlas-pdf-library'||m.schemaVersion!==1||m.id!=='pdfatlas.public'||!/^\d+\.\d+\.\d+$/.test(m.version))fail('format, ID or version');
 if(!/^https:\/\/raw\.githubusercontent\.com\/julian-passebecq\/pdfatlas\/(?:main|[a-f0-9]{40})\/$/.test(base))fail('base URL must be the exact public repository and main or a pinned commit');
 if(!Array.isArray(m.entries)||!m.entries.length||m.entries.length>10000)fail('entries');
 const ids=new Set(),paths=new Set();
 const text=(s,n)=>{if(typeof s!=='string'||!s.trim()||s.length>4000)fail(n);};
 for(const e of m.entries){
  if(!ID.test(e.id)||!e.id.startsWith('doc.pdfatlas.')||ids.has(e.id))fail('unique stable document ID');ids.add(e.id);
  text(e.title,'title');text(e.summary,'summary');
  if(!/^library\/(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*\.pdf$/.test(e.relativePath)||paths.has(e.relativePath))fail('safe unique relative PDF path');paths.add(e.relativePath);
  if(!/^[a-f0-9]{64}$/.test(e.sha256))fail('SHA-256');
  if(!Number.isInteger(e.bytes)||e.bytes<5||e.bytes>100*1024*1024)fail('byte count');
  if(!Number.isInteger(e.pageCount)||e.pageCount<1||e.pageCount>1000000)fail('verified page count');
  if(e.language!==undefined&&!/^[a-z]{2,3}(?:-[A-Za-z]{2,8})?$/.test(e.language))fail('language');
  if(!Array.isArray(e.categoryPath)||!e.categoryPath.length||e.categoryPath.length>3)fail('category path');e.categoryPath.forEach(x=>text(x,'category'));
  if(!Array.isArray(e.tags)||e.tags.some(x=>typeof x!=='string'||x.length>100))fail('tags');
  if(!e.rights||!['reference-only','permission','author-created','unreviewed'].includes(e.rights.status))fail('rights');text(e.rights.attribution,'attribution');text(e.revision,'revision');
 }
 if(!Array.isArray(m.categories))fail('explicit stable category IDs');
 const catIds=new Set(),catPaths=new Set();
 for(const c of m.categories){if(!ID.test(c.id)||!c.id.startsWith('node.pdfatlas.')||catIds.has(c.id)||!Array.isArray(c.path)||!c.path.length||c.path.length>3)fail('category ID/path');catIds.add(c.id);c.path.forEach(x=>text(x,'category'));const key=JSON.stringify(c.path);if(catPaths.has(key))fail('duplicate category path');catPaths.add(key);}
 for(const e of m.entries)for(let n=1;n<=e.categoryPath.length;n++)if(!catPaths.has(JSON.stringify(e.categoryPath.slice(0,n))))fail('missing stable category mapping');
 return true;
}
export async function syncPdfatlas(){
 const config=JSON.parse(await fs.readFile('config/pdfatlas.json','utf8')),m=JSON.parse(await fs.readFile('config/pdfatlas.library.json','utf8'));
 validateManifest(m,config.baseUrl);
 const root='content/packs/pdfatlas.public';await fs.rm(root,{recursive:true,force:true});await fs.mkdir(root+'/pages',{recursive:true});
 const write=(file,data)=>fs.writeFile(root+'/'+file,JSON.stringify(data,null,2)+'\n');
 const categories=new Map();const nodes=[];
 for(const c of [...m.categories].sort((a,b)=>a.path.length-b.path.length)){
  const node={id:c.id,title:c.path.at(-1),children:[]};categories.set(JSON.stringify(c.path),node);
  if(c.path.length===1)nodes.push(node);else {const parent=categories.get(JSON.stringify(c.path.slice(0,-1)));if(!parent)throw Error('Category has no parent');parent.children.push(node);}
 }
 const documents=[];
 for(const e of m.entries){
  const pageId=e.id.replace(/^doc\./,'page.'),nodeId=e.id.replace(/^doc\./,'node.'),url=config.baseUrl+e.relativePath;
  if(m.categories.some(c=>c.id===nodeId))throw Error('Document and category node IDs collide');
  categories.get(JSON.stringify(e.categoryPath)).children.push({id:nodeId,title:e.title,pageId});
  await write('pages/'+pageId+'.json',{id:pageId,title:e.title,summary:e.summary,blocks:[{id:e.id.replace(/^doc\./,'block.')+'.reference',type:'markdown',text:e.summary+'\n\nExternal PDF reference. '+e.rights.attribution}],related:[],terms:[],sources:[{title:e.title,url,note:e.rights.attribution}],tags:[...e.tags,...(e.language?['lang:'+e.language]:[])],provenance:'Metadata inspected from user-supplied pdfatlas snapshot; PDF binaries are not bundled.'});
  documents.push({id:e.id,pageId,title:e.title,source:{kind:'https',url},sha256:e.sha256,bytes:e.bytes,pageCount:e.pageCount,visibility:'public',rights:{status:e.rights.status,attribution:e.rights.attribution,sourceUrl:url},...(e.language?{language:e.language}:{}),defaultView:'single'});
 }
 await write('projects.json',[{id:'project.pdfatlas',title:m.title,icon:'pdf',description:'External Spark and PySpark references. Verified metadata; PDF bytes remain in the separate public repository.',nodes}]);
 await write('glossary.json',[]);
 await write('atlas-documents.json',{format:'atlas-document-index',schemaVersion:1,version:m.version,packId:'pdfatlas.public',documents});
 await write('atlas-pack.json',{format:'atlas-content-pack',schemaVersion:1,payloadSchema:'atlas.bundle@2',id:'pdfatlas.public',version:m.version,title:m.title,visibility:'public',files:{projects:'projects.json',pages:'pages',glossary:'glossary.json'},requires:[],assets:[],provenance:{kind:'external-references',note:'Reviewed descriptive metadata only. Original third-party PDF bytes excluded; no redistribution rights are asserted.'}});
 const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
 const result=await readWorkspace(await readFiles('content'),schemas);
 const pack=result.packs.find(p=>p.manifest.id==='pdfatlas.public');if(!pack)throw Error('Generated pack missing');
 const review=JSON.parse(await fs.readFile('content/publication-review.json','utf8'));
 review.packs['pdfatlas.public']={metadataOnlyReferences:true,review:'Reviewed user-supplied public reference metadata only. No PDF binaries. Attribution and reference-only rights retained. Final external URL pin and hosting rights require coordinator review.',sha256:pack.hash};
 await fs.writeFile('content/publication-review.json',JSON.stringify(review,null,2)+'\n');
 console.log(JSON.stringify({status:'PASS',entries:documents.length,baseUrl:config.baseUrl,hash:pack.hash,binaryAssets:0,staging:config.baseUrl.endsWith('/main/')},null,2));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await syncPdfatlas();
