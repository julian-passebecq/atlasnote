/** Only a fresh, full, green V23 report for this exact source unlocks the inherited command list. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {acceptsInheritedPrerequisite} from './inherited-prerequisite.mjs';
import {sourceIdentity,sourceHash} from './check-v23-build.mjs';import {releaseStatus,V23_GATES} from './v23-release-contract.mjs';import {secretFreeText} from './provider-access-contract.mjs';
const out=path.resolve(process.env.ATLAS_INHERITED_EVIDENCE??'docs/evidence/v23/inherited');fs.mkdirSync(out,{recursive:true});
const source={...sourceIdentity(),sourceHash:sourceHash()},commands=JSON.parse(fs.readFileSync('tools/v23-inherited-ci.json')).commands;
const requiredFile=process.env.ATLAS_V23_RELEASE_RESULTS??'docs/evidence/v23/release/results.json';
let prerequisite;try{prerequisite=JSON.parse(fs.readFileSync(requiredFile));}catch{}
const green=acceptsInheritedPrerequisite(prerequisite,source);
const report={...source,prerequisiteRunId:prerequisite?.runId??null,status:green?'RUNNING':'NOT_RUN',reason:green?null:'A fresh fully green provider-neutral V23 release on this exact clean source is required.',results:commands.map(command=>({command,status:'NOT_RUN'}))};
const save=()=>fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));save();
if(!green){console.log(report.reason);process.exitCode=2;}else{
 const inheritedEnv={...process.env};delete inheritedEnv.VERCEL_TOKEN;delete inheritedEnv.VERCEL_AUTOMATION_BYPASS_SECRET;
 for(const row of report.results){
  const start=Date.now(),log=String(report.results.indexOf(row)+1).padStart(2,'0')+'.log';
  const child=spawnSync(row.command,{shell:true,encoding:'utf8',timeout:900000,maxBuffer:32*1024*1024,env:inheritedEnv});
  fs.writeFileSync(path.join(out,log),secretFreeText((child.stdout??'')+(child.stderr??''),[process.env.VERCEL_TOKEN,process.env.VERCEL_AUTOMATION_BYPASS_SECRET]));
  Object.assign(row,{status:child.status===0&&!child.signal&&!child.error?'PASS':child.status===2?'BLOCKED':'FAIL',exitCode:child.status,signal:child.signal,durationMs:Date.now()-start,log});
  if(sourceHash()!==source.sourceHash||sourceIdentity().sourceDirty){row.status='FAIL';row.reason='Inherited command changed candidate source; freeze and requalify rather than relabeling evidence.';}
  save();console.log(row.status,row.command);if(row.status!=='PASS')break;
 }
 report.status=report.results.every(r=>r.status==='PASS')?'PASS':report.results.some(r=>r.status==='FAIL')?'FAIL':'BLOCKED';save();process.exitCode=report.status==='PASS'?0:2;
}
