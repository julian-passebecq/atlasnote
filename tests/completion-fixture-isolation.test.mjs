/** Fixture/orchestration regressions only; never integrated-browser or hosted proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runCompletionRuntime} from '../tools/run-completion-runtime.mjs';
import {sourceHash} from '../tools/check-v23-build.mjs';
import {loadSchemas} from '../src/core/packs.mjs';
import {readBackup, unzipBounded} from '../src/storage/archives.mjs';

const ROOT=fileURLToPath(new URL('../',import.meta.url));
const ok={status:0,signal:null,error:undefined};
const quiet=()=>{};
function temporary(fn){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atlasnote-isolation-test-'));
 try{return fn(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}

test('completion npm command isolates fixtures; manual documentation generation stays explicit',()=>{
 const scripts=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'))).scripts;
 assert.equal(scripts['test:completion:runtime'],'node tools/run-completion-runtime.mjs');
 assert.equal(scripts['generate:v22:examples'],'node tools/generate-v22-examples.mjs');
 const commands=JSON.parse(fs.readFileSync(path.join(ROOT,'tools/v23-inherited-ci.json'))).commands;
 assert.equal(commands.length,54);
 assert.deepEqual(commands.slice(-3),['npm run test:completion:runtime','npm run test:pdf:lifecycle','npm run test:headers']);
});

test('browser references a single fixture root; all 15 acceptance cases remain registered',()=>{
 const source=fs.readFileSync(path.join(ROOT,'tests/completion_v22_runtime.py'),'utf8');
 assert.equal(source.match(/docs\/examples\/v22/g)?.length,1); // manual fallback only
 assert(source.includes("EXAMPLES = Path(os.environ.get('ATLAS_V22_EXAMPLES_DIR'"));
 assert(source.includes("EXAMPLES.glob('changeset-*.json')"));
 for(const name of ['capabilities-context-keyboard-menus','review-invalid-import-subset-double-click','history-compare-real-tab-concurrency','distinct-byte-pdf-reload-backup','legacy-schema-2-3-fresh-profile-restores','rich-nonempty-v2-migration','five-theme-responsive-matrix','pinned-links-and-restore','quota-failure-atomicity','all-25-action-kinds-through-review','corrupt-backups-rejected-atomically','history-pagination-and-structure','all-resource-keyboard-menus','deleted-source-pinned-startup','exact-historical-targets-and-wrappers'])assert(source.includes("('"+name+"',"),name);
});

test('generator then original browser receive the same fresh root, no shell, and caller env is unchanged',()=>temporary(tempRoot=>{
 const env={...process.env,ATLAS_V22_EXAMPLES_DIR:'must-not-reuse',ATLAS_PYTHON:'python executable with spaces',CLOUDFLARE_API_TOKEN:'unit-only-metadata',CF_ACCESS_CLIENT_ID:'unit-only-id',CF_ACCESS_CLIENT_SECRET:'unit-only-secret',VERCEL_TOKEN:'unit-only-vercel',VERCEL_AUTOMATION_BYPASS_SECRET:'unit-only-bypass'};
 const original={...env},calls=[];
 const code=runCompletionRuntime({tempRoot,env,log:quiet,run:(command,args,options)=>{
  calls.push({command,args,options});
  assert.equal(options.shell,false);assert.equal(options.cwd,ROOT);
  assert(!Object.keys(options.env).some(k=>/^(CLOUDFLARE_API_TOKEN|CF_ACCESS_CLIENT_ID|CF_ACCESS_CLIENT_SECRET|VERCEL_TOKEN|VERCEL_AUTOMATION_BYPASS_SECRET)$/.test(k)));
  assert(options.env.ATLAS_V22_EXAMPLES_DIR.startsWith(tempRoot+path.sep));
  assert(fs.existsSync(path.dirname(options.env.ATLAS_V22_EXAMPLES_DIR)));
  return ok;
 }});
 assert.equal(code,0);assert.equal(calls.length,2);
 assert.equal(calls[0].command,process.execPath);
 assert.deepEqual(calls[0].args,[path.join(ROOT,'tools/generate-v22-examples.mjs'),'--output-dir',calls[1].options.env.ATLAS_V22_EXAMPLES_DIR]);
 assert.equal(calls[1].command,env.ATLAS_PYTHON);
 assert.deepEqual(calls[1].args,[path.join(ROOT,'tests/completion_v22_runtime.py')]);
 assert.deepEqual(env,original);assert.deepEqual(fs.readdirSync(tempRoot),[]);
}));

for(const [label,result,expected] of [
 ['nonzero',{status:7},7],['blocked',{status:2},2],['signal',{status:null,signal:'SIGTERM'},1],
 ['missing executable',{status:null,error:{code:'ENOENT'}},1],['timeout',{status:null,error:{code:'ETIMEDOUT'}},1],
 ['invalid status',{status:null},1],
])test('generator '+label+' prevents browser execution and still cleans up',()=>temporary(tempRoot=>{
 let calls=0;const code=runCompletionRuntime({tempRoot,log:quiet,run:()=>{calls++;return result;}});
 assert.equal(code,expected);assert.equal(calls,1);assert.deepEqual(fs.readdirSync(tempRoot),[]);
}));

for(const [label,result,expected] of [
 ['failure',{status:4},4],['blocked',{status:2},2],['missing Python',{status:null,error:{code:'ENOENT'}},1],['signal',{status:null,signal:'SIGTERM'},1],
])test('browser '+label+' remains non-green and temporary files are removed',()=>temporary(tempRoot=>{
 let calls=0;const code=runCompletionRuntime({tempRoot,log:quiet,run:()=>++calls===1?ok:result});
 assert.equal(code,expected);assert.equal(calls,2);assert.deepEqual(fs.readdirSync(tempRoot),[]);
}));

test('unexpected runner exceptions are not converted to success and cannot leak fixture directories',()=>temporary(tempRoot=>{
 assert.throws(()=>runCompletionRuntime({tempRoot,log:quiet,run:()=>{throw Error('unit failure');}}),/unit failure/);
 assert.deepEqual(fs.readdirSync(tempRoot),[]);
}));

test('overlapping invocations use distinct directories and cannot delete each other or a sibling',()=>temporary(tempRoot=>{
 const sentinel=path.join(tempRoot,'keep.txt');fs.writeFileSync(sentinel,'not ours');
 let outer,inner,outerCalls=0;
 assert.equal(runCompletionRuntime({tempRoot,log:quiet,run:(_command,_args,options)=>{
  if(++outerCalls===1){
   outer=path.dirname(options.env.ATLAS_V22_EXAMPLES_DIR);
   assert.equal(runCompletionRuntime({tempRoot,log:quiet,run:(_c,_a,o)=>{
    inner=path.dirname(o.env.ATLAS_V22_EXAMPLES_DIR);assert.notEqual(outer,inner);assert(fs.existsSync(outer));return ok;
   }}),0);
   assert(fs.existsSync(outer));assert(!fs.existsSync(inner));
  }return ok;
 }}),0);
 assert(!fs.existsSync(outer));assert.equal(fs.readFileSync(sentinel,'utf8'),'not ours');
}));

for(const args of [['--output-dir'],['--output-dir',''],['--other','somewhere'],['--output-dir','--other']])test('generator rejects invalid output arguments '+JSON.stringify(args),()=>{
 const before=sourceHash();
 const child=spawnSync(process.execPath,['tools/generate-v22-examples.mjs',...args],{cwd:ROOT,encoding:'utf8',timeout:30000});
 assert.notEqual(child.status,0);assert.match(child.stderr,/Usage:/);assert.equal(sourceHash(),before);
});

test('two real generations validate 4 backup archives and all 26 operation kinds without source drift',async()=>{
 const before=sourceHash(),captures=[];
 temporary(tempRoot=>{
  for(let i=0;i<2;i++){
   let calls=0;
   assert.equal(runCompletionRuntime({tempRoot,log:quiet,run:(command,args,options)=>{
    if(++calls===1){
     const child=spawnSync(command,args,{...options,stdio:'pipe',encoding:'utf8'});
     assert.equal(child.status,0,child.stderr);
     assert.match(child.stdout,/"operationKinds": 26/);return child;
    }
    const directory=options.env.ATLAS_V22_EXAMPLES_DIR;
    const names=fs.readdirSync(directory),index=JSON.parse(fs.readFileSync(path.join(directory,'INDEX.json')));
    assert.equal(names.filter(n=>n.startsWith('changeset-')).length,24);
    assert.equal(index.plans.length,24);assert.equal(new Set(index.plans.flatMap(p=>p.operations)).size,26);
    assert.equal(names.length,32);assert.equal(names.filter(n=>n.endsWith('.atlas-backup.zip')).length,4);
    const archives=names.filter(n=>n.endsWith('.atlas-backup.zip')).map(n=>({name:n,bytes:fs.readFileSync(path.join(directory,n))}));
    captures.push({directory,archives});return ok; // orchestration consumer, NOT a browser PASS
   }}),0);
   assert.equal(calls,2);assert.equal(sourceHash(),before);assert.deepEqual(fs.readdirSync(tempRoot),[]);
  }
 });
 assert.notEqual(captures[0].directory,captures[1].directory);
 const schemas=await loadSchemas(name=>fs.promises.readFile(path.join(ROOT,'src/content/schemas',name),'utf8'));
 for(const capture of captures)for(const archive of capture.archives){
  const restored=await readBackup((await unzipBounded(archive.bytes)).files,schemas);
  assert(restored.workspace,archive.name);
 }
 assert.equal(sourceHash(),before);
});


test('both clean-checkout V23 jobs prepare separate compatibility fixtures before the integrated build',()=>{
 const text=fs.readFileSync(path.join(ROOT,'.github/workflows/v23-qualification.yml'),'utf8');
 for(const job of ['portable-core','full-v23']){
  const block=text.split('  '+job+':\n')[1].split(/\n  [a-z][a-z-]+:\n/)[0];
  const offline=block.indexOf('- run: npm run build:offline'),integrated=block.indexOf('- run: npm run build\n');
  assert(offline>=0 && integrated>offline,job);
  assert(block.indexOf('- run: npm run test:v23:')>integrated,job);
 }
 assert(text.includes('needs: portable-core'));
 assert(!text.includes('continue-on-error: true'));
});
