/** Build-time fail-closed deployment contract. Runtime secrets are deliberately
 * neither read nor needed: an unconfigured deployed site remains locked. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
export async function checkAccessBuild(){
 const [{config:auth},{config:unlock},{config:lock}]=await Promise.all(['atlas-auth','atlas-unlock','atlas-lock'].map(name=>import('../netlify/edge-functions/'+name+'.js')));
 assert.equal(auth.path,'/*');assert.deepEqual(auth.excludedPath,['/__atlasnote_unlock','/__atlasnote_lock']);assert.equal(unlock.path,'/__atlasnote_unlock');assert.equal(lock.path,'/__atlasnote_lock');
 for(const c of [auth,unlock,lock]){assert.equal(c.onError,'fail');assert.equal(c.cache,undefined);}
 assert.deepEqual(unlock.rateLimit,{windowLimit:5,windowSize:60,aggregateBy:['ip','domain']});assert.equal(auth.rateLimit,undefined);assert.equal(lock.rateLimit,undefined);
 const config=await fs.readFile('netlify.toml','utf8');assert(/publish\s*=\s*"dist"/.test(config));assert(/edge_functions\s*=\s*"netlify\/edge-functions"/.test(config));
 const walk=async dir=>{const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;};
 for(const p of [...await walk('src'),...await walk('public')]){if(!/\.(?:js|mjs|ts|tsx|html|json|map)$/.test(p))continue;const text=await fs.readFile(p,'utf8');assert(!/ATLASNOTE_ACCESS_KEY_SHA256|ATLASNOTE_SESSION_SECRET|netlify\/lib\/access|atlas1_[A-Za-z0-9_-]{43}/.test(text),'Server access material must never enter the client graph: '+p);}
 return {status:'PASS',scope:'Static Netlify function declarations and client-secret exclusion; provider deployment recognition tested separately'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)console.log(JSON.stringify(await checkAccessBuild(),null,2));
