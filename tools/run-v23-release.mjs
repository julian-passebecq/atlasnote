/** Every mandatory gate runs fresh; source drift, timeout, skip or BLOCKED stays non-green. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
import {V23_GATES,PROVIDER_CASES,releaseStatus} from './v23-release-contract.mjs';import {sourceIdentity,sourceHash} from './check-v23-build.mjs';
import {secretFreeText,freshProviderEvidence} from './provider-access-contract.mjs';
const portable=process.argv.includes('--portable');
const required=portable?V23_GATES.filter(id=>id!=='test:v23:access:preview').map(id=>id==='test:v23:runtime'?'test:v23:runtime:portable':id):V23_GATES;
const out=path.resolve(process.env.ATLAS_EVIDENCE??(portable?'docs/evidence/v23/portable':'docs/evidence/v23/release'));fs.mkdirSync(out,{recursive:true});
const cli=process.env.npm_execpath;if(!cli)throw Error('Use npm run test:v23:release');
const source={...sourceIdentity(),sourceHash:sourceHash()},rows=[],runId=randomUUID(),startedAt=new Date().toISOString();
const override=process.env.ATLAS_V23_TIMEOUT_MS;
if(override!==undefined&&(!Number.isFinite(Number(override))||Number(override)<1000))throw Error('Invalid timeout');
const secrets=[process.env.VERCEL_TOKEN,process.env.VERCEL_AUTOMATION_BYPASS_SECRET];
const status=()=>{const result=releaseStatus(rows,required);return portable&&result==='READY FOR COORDINATOR QA'?'PORTABLE CORE PASS - NOT A RELEASE':result;};
function save(){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({schemaVersion:2,runId,startedAt,finishedAt:new Date().toISOString(),...source,scope:portable?'portable-core':'full-v23',status:status(),provider:'vercel',required,counts:Object.fromEntries(['PASS','BLOCKED','FAIL'].map(s=>[s,rows.filter(r=>r.status===s).length])),results:rows},null,2));}
for(const id of required){
 const at=Date.now(),log=id.replaceAll(':','-')+'.log',evidenceDir=path.join(out,id.replaceAll(':','-'));
 const timeout=Number(override??(id==='test:v23:capacity'?900000:240000));
 const env={...process.env,ATLAS_EVIDENCE:evidenceDir,ATLAS_V23_RUN_ID:runId};
 if(id!=='test:v23:access:preview'){delete env.VERCEL_TOKEN;delete env.VERCEL_AUTOMATION_BYPASS_SECRET;}
 const child=spawnSync(process.execPath,[cli,'run',id],{encoding:'utf8',env,timeout,maxBuffer:16*1024*1024});
 fs.writeFileSync(path.join(out,log),secretFreeText((child.stdout??'')+(child.stderr??'')+(child.error?'\n'+child.error.name+': '+child.error.code:''),secrets));
 let rowStatus=child.status===0&&!child.error&&!child.signal?'PASS':child.status===2?'BLOCKED':'FAIL';
 const current={...sourceIdentity(),sourceHash:sourceHash()};
 const drift=current.sourceCommit!==source.sourceCommit||current.sourceHash!==source.sourceHash||current.sourceDirty!==source.sourceDirty;
 if(drift)rowStatus='FAIL';
 if(source.sourceDirty&&rowStatus==='PASS')rowStatus='BLOCKED';
 if(id==='test:v23:access:preview'&&rowStatus==='PASS'){
  let proof;try{proof=JSON.parse(fs.readFileSync(path.join(evidenceDir,'results.json'),'utf8'));}catch{}
  if(!freshProviderEvidence(proof,{...source,runId,startedAt},PROVIDER_CASES))rowStatus='BLOCKED';
 }
 rows.push({id,command:'npm run '+id,status:rowStatus,exitCode:child.status,signal:child.signal,errorCode:child.error?.code,durationMs:Date.now()-at,timeoutMs:timeout,log,sourceDrift:drift,sourceHash:current.sourceHash});
 save();console.log(rowStatus,id);
}
console.log(status());process.exitCode=releaseStatus(rows,required)==='READY FOR COORDINATOR QA'?0:2;
