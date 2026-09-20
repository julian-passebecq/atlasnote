/** Active provider static contract. Cloudflare Access must ALSO be verified live. */
import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import {validateCloudflareConfig,validateStaticHeaders} from './provider-access-contract.mjs';
export async function checkAccessBuild(){
 validateCloudflareConfig(JSON.parse(await fs.readFile('wrangler.jsonc','utf8')));
 validateStaticHeaders(await fs.readFile('public/_headers','utf8'));
 const walk=async dir=>{const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;};
 for(const p of [...await walk('src'),...await walk('public')]){
  if(!/\.(?:js|mjs|ts|tsx|html|json|map)$/.test(p))continue;
  const text=await fs.readFile(p,'utf8');
  assert(!/ATLASNOTE_ACCESS_KEY_SHA256|ATLASNOTE_SESSION_SECRET|netlify\/lib\/access|atlas1_[A-Za-z0-9_-]{43}|CLOUDFLARE_API_TOKEN|CF_ACCESS_CLIENT_SECRET|CF-Access-Client-Secret|cfast_[A-Za-z0-9]{40,}/.test(text),'Server credentials/automation material must never enter the client graph: '+p);
 }
 const panel=await fs.readFile('src/durability/DurabilityPanel.tsx','utf8');
 assert(!panel.includes('/__atlasnote_lock'),'Managed-provider UI must not POST a legacy logout');
 return {status:'PASS',provider:'cloudflare',access:'managed',scope:'React/Vite SPA, Wrangler Static Assets configuration, _headers policy and client-secret exclusion only. Does NOT prove Cloudflare Access is enabled. Fresh protected-preview qualification remains mandatory.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)console.log(JSON.stringify(await checkAccessBuild(),null,2));
