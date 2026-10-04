import test from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationController,geometryCompensation,physicalPageHeight} from '../src/pdf/navigation-controller.mjs';
import {createWheelPager} from '../src/pdf/wheel-navigation.mjs';
import {createNavigationTrace} from '../src/pdf/navigation-trace.mjs';
import {mergePersonal,preserveDisplayedSession} from '../src/storage/personal-merge.mjs';
import {createVerifiedCache} from '../dist-offline/app/pdf/verified-cache.js';

const view={documentKey:'a:hash',targetPage:2,geometryKey:'700:0:hidden'};
test('V31 a stale completion cannot finish or reacquire a newer navigation',()=>{
 const n=createNavigationController(()=>100),old=n.begin(view),latest=n.begin({...view,targetPage:3});
 assert.equal(n.canApply(old,view),false);assert.equal(n.finish(old),false);
 assert.equal(n.canApply(latest,{...view,targetPage:3}),true);assert.equal(n.finish(latest),true);
 assert.equal(n.canApply(latest,{...view,targetPage:3}),false);
});
test('V31 user input, wrong page, document or geometry reject pending restoration',()=>{
 const n=createNavigationController(()=>100),intent=n.begin(view);
 for(const v of [{...view,geometryKey:'900:90:shown'},{...view,documentKey:'b'},{...view,targetPage:1}])assert.equal(n.canApply(intent,v),false);
 n.cancel();assert.equal(n.canApply(intent,view),false);assert.equal(n.state().pending,false);
});
test('V31 geometry compensation preserves intervening native movement',()=>{
 // Native scroll +60, prefix geometry +25: observed element moves -35.
 assert.equal(geometryCompensation(100,65,500,560),25);
 assert.equal(physicalPageHeight(600,1,false),600);
 assert.equal(physicalPageHeight(600,1,true),620);
 assert.equal(physicalPageHeight(600,1/2,false),300);
});
const tick=(pager,t,dy=66.667,extra={})=>pager({now:t,deltaY:dy,mode:'single',top:dy<0,bottom:dy>0,...extra});
test('V31 separated stable wheel detents do not latch forever at the boundary',()=>{
 const pager=createWheelPager();let turns=0;
 for(let t=0;t<=5000;t+=100)turns+=tick(pager,t);
 assert(turns>1&&turns<=11,'new detent intentions, still bounded by cooldown');
});
test('V31 fast momentum and its declining tail cannot auto-turn many pages',()=>{
 const pager=createWheelPager();let turns=0;
 for(let t=0;t<3000;t+=10)turns+=tick(pager,t,100);
 for(let i=0;i<20;i++)turns+=tick(pager,3000+i*100,30-i);
 assert.equal(turns,1);
});
test('V31 deliberate reversal works without a pause but small jitter cannot reverse',()=>{
 const pager=createWheelPager();assert.equal(tick(pager,0,120),1);
 for(let t=10;t<600;t+=10)tick(pager,t,1);
 for(let t=600;t<700;t+=10)assert.equal(tick(pager,t,-1),0);
 assert.equal(tick(pager,710,-70),0);assert.equal(tick(pager,720,-70),-1);
 pager.reset();assert.equal(tick(pager,730,120),1);
});
test('V31 trace distinguishes requested and actual displacement and redacts identity extras',()=>{
 const trace=createNavigationTrace(2);
 trace.setBuildIdentity({appVersion:'3.1.0-rc.1',sourceCommit:'a'.repeat(40),sourceHash:'b'.repeat(64),buildKind:'integrated',secret:'never'});
 trace.record('restore',{doc:'private.pdf',delta:1000,applied:0,before:90,after:90,url:'never'});
 const json=JSON.stringify(trace.snapshot());assert(!json.includes('private.pdf'));assert(!json.includes('never'));
 assert.equal(trace.snapshot().schema,'atlas-pdf-navigation-trace/2');assert.equal(trace.snapshot().rows[0].applied,0);
});
test('V31 durable checkpoint conflict does not navigate the active tab',()=>{
 const base={schemaVersion:3,activeWorkspaceSlot:1,session:{page:1},workspaceSlots:{},ratings:{}};
 const ours={...base,session:{page:20}},theirs={...base,session:{page:3},ratings:{remote:'green'}};
 const durable=mergePersonal(base,ours,theirs,{preferTheirs:true}).personal;
 assert.equal(durable.session.page,3);
 const displayed=preserveDisplayedSession(durable,ours);
 assert.equal(displayed.session.page,20);assert.equal(displayed.ratings.remote,'green');assert.equal(durable.session.page,3);
});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function cacheFixture(budget=100){const calls=[],created=[],revoked=[];const cache=createVerifiedCache((_key,signal)=>{const d=deferred();calls.push({...d,signal});return d.promise;},budget,{create:b=>{const url='blob:test/'+created.length;created.push({url,size:b.size});return url;},revoke:u=>revoked.push(u)});return {cache,calls,created,revoked};}
test('V31 late success after final lease release never allocates an orphan URL',async()=>{
 const f=cacheFixture(),lease=f.cache.acquire('a');lease.release();assert(f.calls[0].signal.aborted);
 f.calls[0].resolve(new Uint8Array(4));await assert.rejects(lease.url,{name:'AbortError'});
 assert.equal(f.created.length,0);assert.equal(f.cache.stats().entries,0);
});
test('V31 old rejection after reacquisition cannot delete the new entry',async()=>{
 const f=cacheFixture(),a=f.cache.acquire('a');a.release();const b=f.cache.acquire('a');
 f.calls[0].reject(Error('old'));await assert.rejects(a.url,/old/);
 f.calls[1].resolve(new Uint8Array(4));await b.url;assert.equal(f.cache.stats().leased,1);b.release();f.cache.clear();assert.equal(f.revoked.length,1);
});
test('V31 A/B sharing and clear preserve leased URLs and evict only unleased ones',async()=>{
 const f=cacheFixture(1),a=f.cache.acquire('a'),b=f.cache.acquire('a');assert.equal(f.calls.length,1);
 f.calls[0].resolve(new Uint8Array(4));assert.equal(await a.url,await b.url);
 a.release();f.cache.clear();assert.equal(f.revoked.length,0);b.release();assert.equal(f.revoked.length,1);assert.equal(f.cache.stats().bytes,0);
});
