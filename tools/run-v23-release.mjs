/** Run every added gate, retain nonzero outcomes, never skip to a green result. */
import {spawnSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';
const out=path.resolve(process.env.ATLAS_EVIDENCE??'docs/evidence/v23/release');fs.mkdirSync(out,{recursive:true});
const npmCli=process.env.npm_execpath;if(!npmCli)throw Error('Use npm run test:v23:release');
const source=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();const results=[];
for(const command of ['typecheck','check:access','test:v23','test:v23:capacity','test:v23:runtime','test:v23:layout']){
 const started=Date.now(),env={...process.env,ATLAS_EVIDENCE:path.join(out,command.replaceAll(':','-'))};const r=spawnSync(process.execPath,[npmCli,'run',command],{env,encoding:'utf8',timeout:180000,maxBuffer:32*1024*1024});
 const log=command.replaceAll(':','-')+'.log';fs.writeFileSync(path.join(out,log),(r.stdout??'')+(r.stderr??'')+(r.error?'\n'+r.error.stack:''));const row={command:'npm run '+command,status:r.status===0?'PASS':r.status===2?'BLOCKED':'FAIL',exitCode:r.status,signal:r.signal,log,durationMs:Date.now()-started};results.push(row);console.log(row.status,row.command);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceCommit:source,results},null,2));
}
const cli=spawnSync('netlify',['--version'],{encoding:'utf8',timeout:10000});results.push({command:'netlify --version',status:cli.status===0?'AVAILABLE_NOT_PROVIDER_CERTIFICATION':'BLOCKED',detail:cli.error?.code??cli.stdout??cli.stderr});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceCommit:source,results},null,2));process.exitCode=results.every(r=>r.status==='PASS')?0:2;
