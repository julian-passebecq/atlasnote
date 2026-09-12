/** Bounded validator for the explicit JSON Schema vocabulary used by Atlas schemas.
 * No coercion, field stripping, remote schema fetching or executable schema hooks. */
export const ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
export const forbidden=new Set(['__proto__','constructor','prototype']);
export function stable(value){if(Array.isArray(value))return '['+value.map(x=>stable(x)??'null').join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value);}
export async function sha256(bytes){const input=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',input))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function safePath(path){if(typeof path!=='string'||path.length>500||!path||/[\\\x00-\x1f:]/.test(path)||path.startsWith('/')||path.split('/').some(x=>['..','.',''].includes(x)))throw Error('Unsafe relative path: '+path);return path;}
export function safeUrl(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&!/[\x00-\x20\\]/.test(url);}catch{return false;}}
export function inspectObject(value,depth=0,count={n:0}){if(depth>100||++count.n>250000)throw Error('Content exceeds structural safety limit');if(value&&typeof value==='object')for(const [k,v]of Object.entries(value)){if(forbidden.has(k))throw Error('Reserved key: '+k);inspectObject(v,depth+1,count);}}
export function validateSchema(value,schema,label='record'){
 inspectObject(value);const root=schema;
 function check(v,s,at,depth=0){if(depth>150)return [at+': schema nesting limit'];if(s===true)return [];if(s===false)return [at+': forbidden'];if(s.$ref){const x=s.$ref;if(!x.startsWith('#/'))return [at+': external schema refs forbidden'];let ref=root;for(const key of x.slice(2).split('/'))ref=ref[key];return check(v,ref,at,depth+1);}
 let errors=[];
 if(s.oneOf&&s.oneOf.filter(x=>check(v,x,at,depth+1).length===0).length!==1)return [at+': unsupported fields or invalid record variant'];
 if(s.anyOf&&!s.anyOf.some(x=>check(v,x,at,depth+1).length===0))errors.push(at+': no allowed variant');
 if(s.allOf)for(const x of s.allOf)errors.push(...check(v,x,at,depth+1));
 if(s.not&&check(v,s.not,at,depth+1).length===0)errors.push(at+': disallowed combination');
 if(s.if){const branch=check(v,s.if,at,depth+1).length===0?s.then:s.else;if(branch)errors.push(...check(v,branch,at,depth+1));}
 if('const'in s&&v!==s.const)errors.push(at+': unexpected constant');
 if(s.enum&&!s.enum.some(x=>stable(x)===stable(v)))errors.push(at+': unknown enumeration value');
 const type=Array.isArray(v)?'array':v===null?'null':typeof v;
 if(s.type&&!([s.type].flat().includes(type)||(s.type==='integer'&&Number.isInteger(v))))return [...errors,at+': expected '+s.type];
 if(type==='object'){
  for(const k of s.required??[])if(!(k in v))errors.push(at+'.'+k+': required');
  for(const [k,x]of Object.entries(v)){if(s.properties?.[k])errors.push(...check(x,s.properties[k],at+'.'+k,depth+1));else if(s.additionalProperties===false)errors.push(at+'.'+k+': unsupported field');else if(s.additionalProperties&&typeof s.additionalProperties==='object')errors.push(...check(x,s.additionalProperties,at+'.'+k,depth+1));}
 }
 if(type==='array'){if(s.minItems!==undefined&&v.length<s.minItems||s.maxItems!==undefined&&v.length>s.maxItems)errors.push(at+': invalid array length');if(s.items)v.forEach((x,i)=>errors.push(...check(x,s.items,at+'['+i+']',depth+1)));if(s.uniqueItems&&new Set(v.map(stable)).size!==v.length)errors.push(at+': repeated item');}
 if(type==='string'){if(s.maxLength!==undefined&&v.length>s.maxLength||s.minLength!==undefined&&v.length<s.minLength)errors.push(at+': invalid text length');if(s.pattern&&!new RegExp(s.pattern).test(v))errors.push(at+': invalid format');if(s.format==='uri'&&!safeUrl(v))errors.push(at+': unsafe URI');}
 if(type==='number'&&(s.minimum!==undefined&&v<s.minimum||s.maximum!==undefined&&v>s.maximum))errors.push(at+': outside range');return errors;
 }
 const result=check(value,schema,label);if(result.length)throw Error(result.slice(0,20).join('\n'));return value;
}
export async function migratePage(page){const p=structuredClone(page),used=new Set(),assignments=[];
 function pre(blocks){for(const b of blocks){if(b.id){if(!ID.test(b.id)||used.has(b.id))throw Error('Invalid/duplicate block ID in '+p.id);used.add(b.id);}if(b.children)pre(b.children);}}pre(p.blocks);
 async function walk(blocks,prefix){for(let i=0;i<blocks.length;i++){const b=blocks[i],pointer=prefix+'/'+i;if(!b.id){let salt=0,id;do{id='block.'+(await sha256(p.id+'\0'+pointer+'\0'+salt++)).slice(0,24);}while(used.has(id));b.id=id;used.add(id);assignments.push({pageId:p.id,sourcePointer:pointer,blockId:id});}if(b.children)await walk(b.children,pointer+'/children');}}await walk(p.blocks,'/blocks');return {page:p,assignments};}
export function walkBlocks(blocks,fn,parents=[]){for(const b of blocks){fn(b,parents);if(b.type==='section')walkBlocks(b.children,fn,[...parents,b.id]);}}
export function pageLinks(page){const ids=new Set(page.related);walkBlocks(page.blocks,b=>{if(b.type==='link')ids.add(b.pageId);if(b.type==='code'||b.type==='diagram')return;for(const val of Object.values(b)){if(typeof val==='string')for(const m of val.matchAll(/\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|[^\]]*)?\]\]/g))if(ID.test(m[1]))ids.add(m[1]);}});return [...ids];}
export function validateRelations(packs,{allowUnresolved=false}={}){
 const owners=new Map(),pages=new Map(),terms=new Map(),projects=new Map(),nodeIds=new Set(),locations=new Map();
 function put(id,pack,map,value){if(owners.has(id))throw Error('Duplicate owner for '+id+' ('+owners.get(id)+' and '+pack.manifest.id+')');owners.set(id,pack.manifest.id);map.set(id,value);}
 for(const pack of packs){for(const p of pack.pages)put(p.id,pack,pages,p);for(const t of pack.glossary)put(t.id,pack,terms,t);for(const p of pack.projects)put(p.id,pack,projects,p);}
 const documentIds=new Set(),documentPages=new Set();for(const pack of packs)for(const d of pack.documents??[]){if(documentIds.has(d.id))throw Error('Duplicate document ID: '+d.id);if(documentPages.has(d.pageId))throw Error('Multiple PDFs for wrapper page: '+d.pageId);documentIds.add(d.id);documentPages.add(d.pageId);}
 const missing=[];const check=(id,kind,from,map)=>{if(!map.has(id))missing.push({from,target:id,kind});};
 for(const [id,p]of pages){const blocks=new Set();walkBlocks(p.blocks,b=>{if(!ID.test(b.id)||blocks.has(b.id))throw Error('Duplicate/missing stable block ID: '+id+'/'+b.id);blocks.add(b.id);if(b.source?.url&&!safeUrl(b.source.url))throw Error('Unsafe provenance URL');if(b.src){if(!safeUrl(b.src))safePath(b.src);} });for(const t of p.terms)check(t,'term',id,terms);for(const link of pageLinks(p))check(link,'page-link',id,pages);}
 function walk(nodes,project,depth=0){if(depth>60)throw Error('Folder depth exceeds 60');for(const n of nodes){if(nodeIds.has(n.id))throw Error('Duplicate node ID: '+n.id);nodeIds.add(n.id);if(n.pageId){check(n.pageId,'tree',n.id,pages);if(locations.has(n.pageId))throw Error('Page appears more than once in tree: '+n.pageId);locations.set(n.pageId,project);}if(n.children)walk(n.children,project,depth+1);}}
 for(const p of projects.values())walk(p.nodes,p.id);for(const [id,t]of terms)for(const target of t.pageIds)check(target,'glossary-link',id,pages);
 for(const pack of packs){for(const d of pack.documents??[])check(d.pageId,'document-wrapper',d.id,pages);for(const dep of pack.manifest.requires){const owner=packs.find(p=>p.manifest.id===dep.id);if(!owner||compareVersion(owner.manifest.version,dep.version)<0)missing.push({from:pack.manifest.id,target:dep.id,kind:'dependency'});}}
 if(missing.length&&!allowUnresolved)throw Error('Unresolved references: '+JSON.stringify(missing.slice(0,15)));return {owners:Object.fromEntries(owners),missing,pages:pages.size,terms:terms.size,projects:projects.size,glossaryLinks:[...terms.values()].reduce((s,t)=>s+t.pageIds.length,0)};
}
export function compareVersion(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0;}
export function assertSafeAsset(path,bytes,mediaType){safePath(path);if(bytes.length>20*1024*1024)throw Error('Asset exceeds 20 MB: '+path);const ext=path.split('.').pop()?.toLowerCase();if(!['svg','png','jpg','jpeg','webp','pdf'].includes(ext))throw Error('Unsupported/active asset: '+path);
 const expected={svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',pdf:'application/pdf'}[ext];if(mediaType&&mediaType!==expected)throw Error('Asset MIME type does not match extension');
 const text=new TextDecoder().decode(ext==='svg'?bytes:bytes.slice(0,1024));if(ext==='svg'&&(/<\s*(script|foreignObject|iframe|object|embed|animate|set)\b/i.test(text)||/\bon[a-z]+\s*=/i.test(text)||/(?:javascript|data|vbscript)\s*:|<!ENTITY|<!DOCTYPE|@import/i.test(text)||/(?:href|src)\s*=\s*["'](?!#)/i.test(text)||/url\s*\(\s*["']?(?!#)[^)]/i.test(text)))throw Error('Active/external SVG content rejected: '+path);
 if(ext==='pdf'&&!text.startsWith('%PDF-'))throw Error('Not PDF bytes (HTML, LFS or corrupt header): '+path);return true;
}
