/** Diagnostic release runner: every gate gets a real exit code and retained log.
 * Environment preparation (Python requirements and Playwright Chromium) is done
 * by CI before this command. A failed or blocked gate makes the whole run fail. */
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const out=path.resolve('docs/evidence/1.2.6/release-gates');fs.mkdirSync(out,{recursive:true});
const commands=[
 ['clean-install',['ci']], ['integrated-deps',['run','check:integrated-deps']], ['npm-audit',['audit']],
 ['core-typecheck',['run','typecheck']], ['unit',['test']], ['offline-release',['run','check:release:offline']],
 ['online-syntax',['run','test:online:syntax']], ['local-inventory',['run','audit:local']],
 ['dom',['run','test:dom']], ['hardening',['run','test:hardening:ui']], ['reader',['run','test:reader:ui']],
 ['compact',['run','test:compact:ui']], ['finish-ui',['run','test:finish:ui']],
 ['backup-diagnostic',['run','test:backup:diagnostic']], ['pdf-authoring',['run','test:pdf:authoring']],
 ['workspaces-ui',['run','test:workspaces:ui']], ['simplified-ui',['run','test:simplified:ui']], ['reading-ui',['run','test:reading:ui']], ['interview-content',['run','test:interviews']], ['polish-ui',['run','test:polish:ui']], ['integrated-typecheck',['run','typecheck:online']],
 ['integrated-build',['run','build']], ['public-release',['run','check:release']],
 ['component-harness',['run','build:test-harness']], ['pdf-component',['run','test:pdf:component']], ['pdf-grid',['run','test:pdf:grid']], ['pdf-wheel',['run','test:pdf:wheel']],
 ['pdf-runtime',['run','test:pdf']], ['finish-integrated',['run','test:finish:integrated']],
 ['runtime',['run','test:runtime']], ['workspaces-runtime',['run','test:workspaces:runtime']],
 ['saved-states-runtime',['run','test:savedstates:runtime']], ['reading-runtime',['run','test:reading:runtime']], ['headers',['run','test:headers']],
 ['cheatsheets-content',['run','test:cheatsheets']], ['cheatsheets-ui',['run','test:cheatsheets:ui']], ['cheatsheets-runtime',['run','test:cheatsheets:runtime']]
];
// Invoke npm's JavaScript entry point through Node; npm.cmd is not directly
// executable by spawnSync on Windows. See nodejs.org/api/child_process.html.
const npmCli=process.env.npm_execpath;
if(!npmCli || !fs.existsSync(npmCli)) throw new Error('Start the release runner with npm run test:release so the npm CLI path is available.');
const results=[];
for(const [id,args] of commands){
 const start=Date.now();console.log(`START ${id}: npm ${args.join(' ')}`);
 const r=spawnSync(process.execPath,[npmCli,...args],{encoding:'utf8',timeout:600000,maxBuffer:32*1024*1024,env:process.env});
 fs.writeFileSync(path.join(out,id+'.log'),(r.stdout??'')+(r.stderr??'')+(r.error?'\n'+r.error.stack:''));
 const row={id,command:'npm '+args.join(' '),exitCode:r.status,signal:r.signal,status:r.status===0?'PASS':r.status===2?'BLOCKED':'FAIL',durationMs:Date.now()-start,log:id+'.log'};
 results.push(row);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({scope:'All compatibility and integrated release commands, including actual normal-origin tests',commit:process.env.GITHUB_SHA??'local-uncommitted',results},null,2));
 console.log(`${row.status} ${id} (${row.durationMs} ms)${r.status!==0?'\n'+((r.stdout??'')+(r.stderr??'')).slice(-6000):''}`);
}
console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,total:results.length}));
process.exitCode=results.every(r=>r.status==='PASS')?0:1;
