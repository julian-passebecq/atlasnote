/** Supplemental offline diagnostics. Does not replace test:release or production QA. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const dir=path.resolve('docs/evidence/v22/compatibility-rechecks');fs.mkdirSync(dir,{recursive:true});
const commands=[
 ['typecheck',['npm','run','typecheck']],
 ['offline-release',['npm','run','check:release:offline']],
 ['online-syntax',['npm','run','test:online:syntax']],
 ['local-inventory',['npm','run','audit:local']],
 ['content',['npm','run','validate']],
 ['interviews',['npm','run','test:interviews']],
 ['cheatsheets',['npm','run','test:cheatsheets']],
 ['pdfatlas',['npm','run','check:pdfatlas']],
 ['examples',['node','tools/generate-v22-examples.mjs']],
 ['runtime-syntax',['python','-m','py_compile','tests/v22_runtime.py']],
 ['headers-offline',['python','tests/headers_test.py']],
 ['runtime-compatibility',['python','tests/v22_runtime.py']],
 ['integrated-typecheck',['npm','run','typecheck:online']],
 ['integrated-build',['npm','run','build']]
];
const results=[];
for(const [id,cmd]of commands){const start=Date.now();const r=spawnSync(cmd[0],cmd.slice(1),{encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,env:{...process.env,ATLAS_DIST:path.resolve('dist-offline'),ATLAS_V22_DIST:'dist-offline',ATLAS_EVIDENCE:path.join(dir,id)}});const log=id+'.log';fs.writeFileSync(path.join(dir,log),(r.stdout??'')+(r.stderr??'')+(r.error?'\n'+r.error.stack:''));const row={id,command:cmd.join(' '),exitCode:r.status,signal:r.signal,status:r.status===0?'PASS':id==='runtime-compatibility'&&r.status===2?'BLOCKED':'FAIL',durationMs:Date.now()-start,log};results.push(row);console.log(row.status,id);}
const report={scope:'Supplemental final-source checks using the shipped compatibility toolchain; NOT a complete/integrated release run. The recorded full 50-gate run is retained separately.',results};fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(results.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{})));process.exitCode=results.every(r=>r.status==='PASS')?0:1;
