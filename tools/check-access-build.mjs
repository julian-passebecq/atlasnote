/** Active provider static contract. Managed protection must ALSO be verified live. */
import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
import {validateVercelConfig} from './provider-access-contract.mjs';
export async function checkAccessBuild(){
 validateVercelConfig(JSON.parse(await fs.readFile('vercel.json','utf8')));
 const walk=async dir=>{const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else out.push(p);}return out;};
 for(const p of [...await walk('src'),...await walk('public')]){
  if(!/\.(?:js|mjs|ts|tsx|html|json|map)$/.test(p))continue;
  const text=await fs.readFile(p,'utf8');
  assert(!/ATLASNOTE_ACCESS_KEY_SHA256|ATLASNOTE_SESSION_SECRET|netlify\/lib\/access|atlas1_[A-Za-z0-9_-]{43}|VERCEL_TOKEN|VERCEL_AUTOMATION_BYPASS_SECRET|x-vercel-protection-bypass|_vercel_share/.test(text),'Server credentials/automation material must never enter the client graph: '+p);
 }
 const panel=await fs.readFile('src/durability/DurabilityPanel.tsx','utf8');
 assert(!panel.includes('/__atlasnote_lock'),'Managed-provider UI must not POST a legacy logout');
 return {status:'PASS',provider:'vercel',access:'managed',scope:'Vite SPA/header configuration and client-secret exclusion only. Does NOT prove Deployment Protection is enabled. Fresh protected-preview qualification remains mandatory.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)console.log(JSON.stringify(await checkAccessBuild(),null,2));
