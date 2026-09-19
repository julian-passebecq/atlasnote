/** Guard evidence only. The absent real-IDB matrix remains a mandatory BLOCKED gate. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {COMPACTION_BLOCKED} from '../dist-offline/app/durability/release-state.js';
import {WorkspaceStore} from '../dist-offline/app/storage/database.js';
import {COMPACTION_FAULTS,CAPACITY_BOUNDARIES} from '../tools/v23-release-contract.mjs';
import {sourceIdentity} from '../tools/check-v23-build.mjs';
const out=process.env.ATLAS_EVIDENCE??'docs/evidence/v23/compaction';fs.mkdirSync(out,{recursive:true});const results=[];
try{assert.equal(COMPACTION_BLOCKED,true,'Enabling compaction requires replacing this guard with real five-store browser proof');
 const store=new WorkspaceStore(),before=structuredClone(store.state);let attempts=0;const original=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
 try{Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){attempts++;throw Error('Guard must reject before database access');}});
  for(const receipt of [undefined,null,{},Object.freeze({}),{archiveId:'untrusted'},new Event('click')]){await assert.rejects(()=>store.compactArchive(receipt),/Compaction is disabled/);assert.deepEqual(store.state,before);}
  assert.equal(attempts,0);
 }finally{if(original)Object.defineProperty(globalThis,'indexedDB',original);else delete globalThis.indexedDB;}
 results.push({name:'Disabled guard rejects six fake or absent receipts without state change or database access',status:'PASS',scope:'Node guard only; not rollback proof'});
}catch(e){results.push({name:'Non-shipping guard',status:'FAIL',error:e.stack});}
for(const name of [...COMPACTION_FAULTS,...CAPACITY_BOUNDARIES])results.push({name,status:'BLOCKED',reason:'No destructive transaction ships. Real-browser transaction/rollback/capacity proof is absent; pure plans do not satisfy it.'});
const report={...sourceIdentity(),status:'BLOCKED',scope:'Safe fallback guard plus explicit unqualified matrix',results};fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=results.some(r=>r.status==='FAIL')?1:2;
