/** Local AST/logpoint contract tests; fixtures are not live capacity proof. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeQuotaObservers} from '../tools/native-quota-observer.mjs';
const warning='An estimate is not a reservation. The actual IndexedDB transaction can still fail without a partial commit.';
const concurrency='Another tab changed resource history. Reload before applying this edit. Nothing was overwritten.';
function fixture(suffix='',alias='D'){
 const p='preflight'+suffix,tx='transaction'+suffix,e='estimate'+suffix,r='required'+suffix,i='incoming'+suffix;
 return `async function ${p}(${i},storage){const ${e}={status:'available',available:20000000},${r}=Math.ceil(${i}*1.25)+4*1024*1024;return {status:${e}.status==='available'?'estimated-enough':'unknown',incomingBytes:${i},required:${r},available:${e}.available,warning:${JSON.stringify(warning)}};}
async function commit${suffix}(workspace){const ${tx}=database.transaction(stores,'readwrite');try{if(workspace.stale)throw Error(${JSON.stringify(concurrency)});await done;}catch(error){try{${tx}.abort();}catch{}throw error;}}
export{${p} as ${alias}};`;
}
for(const [suffix,alias] of [['','D'],['Rotated','A'],['Other','PreflightRenamed']])test('Semantic observer survives local/export alias change '+alias,()=>{
 const code=fixture(suffix,alias),result=nativeQuotaObservers(code);assert.equal(result.preflightExport,alias);
 const lines=code.split('\n');assert(lines[result.preflight.lineNumber].slice(result.preflight.columnNumber).startsWith('return'));
 assert(lines[result.transaction.lineNumber].slice(result.transaction.columnNumber).startsWith('try'));
 assert(result.transaction.condition.includes('transaction'+suffix+'.objectStoreNames'));
 new Function(result.preflight.condition);new Function(result.transaction.condition);
});
test('Observer refuses missing semantic boundary or unexported preflight instead of guessing',()=>{
 assert.throws(()=>nativeQuotaObservers(fixture().replace(warning,'changed warning')));
 assert.throws(()=>nativeQuotaObservers(fixture().replace(concurrency,'changed transaction boundary')));
 assert.throws(()=>nativeQuotaObservers(fixture().replace('export{preflight as D};','')));
});
test('Observer refuses duplicate semantic candidates and side effects in return object',()=>{
 assert.throws(()=>nativeQuotaObservers(fixture()+fixture('Two','A')),/Exactly one preflight/);
 assert.throws(()=>nativeQuotaObservers(fixture().replace('incomingBytes:incoming','incomingBytes:incoming++')),/cannot mutate/);
 assert.throws(()=>nativeQuotaObservers(fixture().replace('incomingBytes:incoming','incomingBytes:readAndWrite()')),/side-effect-free/);
});
test('Observer refuses transaction inventory ambiguity',()=>{
 const changed=fixture().replace("const transaction=database.transaction(stores,'readwrite');","const transaction=database.transaction(stores,'readwrite'),second=database.transaction(stores,'readwrite');");
 assert.throws(()=>nativeQuotaObservers(changed),/Exactly one native authored readwrite transaction/);
});
test('Passive transaction condition returns false and leaves native abort handling untouched',()=>{
 const observers=nativeQuotaObservers(fixture()),listeners={},events=[];
 const transaction={objectStoreNames:['assets','history','imports','overlays','personal'],addEventListener:(name,handler)=>{listeners[name]=handler;},error:{name:'UnknownError',message:'fixture only'}};
 const condition=new Function('window','transaction','return '+observers.transaction.condition);
 assert.equal(condition({__nativeEvents:events,__nativePhase:'import'},transaction),false);
 assert.equal(events[0].type,'native-transaction-created');assert.equal(events[0].phase,'import');
 assert.equal(typeof listeners.abort,'function');assert.equal(typeof listeners.complete,'function');
 assert.equal(transaction.error.message,'fixture only');
});
