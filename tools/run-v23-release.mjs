/** Run ALL mandatory V23 gates; retain every exit code, timeout and raw log. */
import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {V23_GATES,releaseStatus} from './v23-release-contract.mjs';import {sourceIdentity} from './check-v23-build.mjs';
const out=path.resolve(process.env.ATLAS_EVIDENCE??'docs/evidence/v23/release');fs.mkdirSync(out,{recursive:true});
const cli=process.env.npm_execpath;if(!cli)throw Error('Use npm run test:v23:release');
const source=sourceIdentity(),rows=[];const timeout=Number(process.env.ATLAS_V23_TIMEOUT_MS??180000);
if(!Number.isFinite(timeout)||timeout<1000)throw Error('Invalid timeout');
function save(){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({...source,status:releaseStatus(rows),required:V23_GATES,results:rows},null,2));}
for(const id of V23_GATES){const at=Date.now(),log=id.replaceAll(':','-')+'.log';const child=spawnSync(process.execPath,[cli,'run',id],{encoding:'utf8',env:{...process.env,ATLAS_EVIDENCE:path.join(out,id.replaceAll(':','-'))},timeout,maxBuffer:16*1024*1024});
 fs.writeFileSync(path.join(out,log),(child.stdout??'')+(child.stderr??'')+(child.error?'\n'+child.error.stack:''));
 rows.push({id,command:'npm run '+id,status:child.status===0&&!child.error&&!child.signal?'PASS':child.status===2?'BLOCKED':'FAIL',exitCode:child.status,signal:child.signal,errorCode:child.error?.code,durationMs:Date.now()-at,log});save();console.log(rows.at(-1).status,id);}
console.log(releaseStatus(rows));process.exitCode=releaseStatus(rows)==='READY FOR COORDINATOR QA'?0:2;
