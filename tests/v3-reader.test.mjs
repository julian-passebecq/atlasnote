import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePageInput,pageRangeLabel} from '../dist-offline/app/pdf/page-input.mjs';
import {createNavigationTrace} from '../dist-offline/app/pdf/navigation-trace.mjs';
import {fallbackPageRows,visibleRowIndexes} from '../dist-offline/app/companion/tree.js';
import {publishPosition,clearPosition,positionsForDocument,publishVerifiedCount,verifiedPageCount,subscribeReaderState} from '../dist-offline/app/pdf/reader-state.js';
import {mergePersonal} from '../dist-offline/app/storage/personal-merge.mjs';
import {blankPersonal} from '../dist-offline/app/core/workspace.js';
import {selectWorkspace} from '../dist-offline/app/core/workspace-slots.js';

test('V3 page input: blank, junk and out-of-range never navigate; valid pages commit',()=>{
 assert.equal(parsePageInput('',28).ok,false);
 assert.equal(parsePageInput('  ',28).ok,false);
 assert.equal(parsePageInput('1.5',28).ok,false);
 assert.equal(parsePageInput('-3',28).ok,false);
 assert.equal(parsePageInput('e5',28).ok,false);
 assert.match(parsePageInput('29',28).message,/outside this PDF \(1 to 28\)/);
 assert.equal(parsePageInput('0',28).ok,false);
 assert.deepEqual(parsePageInput(' 19 ',28),{ok:true,page:19});
 assert.equal(parsePageInput('3',0).ok,false,'no count while opening');
});
test('V3 page range label distinguishes displayed range from the requested page',()=>{
 assert.equal(pageRangeLabel([7],28),'7 / 28');
 assert.equal(pageRangeLabel([7,8],28),'7–8 / 28');
 assert.equal(pageRangeLabel([5,6,7,8],0),'5–8 / ...');
});
test('V3 navigation trace is bounded and privacy-filtered',()=>{
 const trace=createNavigationTrace(3);
 trace.record('wheel',{dy:-12.34567,doc:'doc.private.title',url:'https://secret.example/file.pdf',title:'Private title',text:'selected text',page:7});
 const row=trace.snapshot().rows[0];
 assert.equal(row.dy,-12.346);assert.equal(row.page,7);
 assert.equal(row.doc,'d1','document ID pseudonymized');
 for(const key of ['url','title','text'])assert.equal(key in row,false,key+' must never be traced');
 assert.equal(JSON.stringify(trace.snapshot()).includes('secret'),false);
 for(let i=0;i<5;i++)trace.record('restore',{reason:'layout'});
 assert.equal(trace.snapshot().rows.length,3);assert.equal(trace.snapshot().dropped,3);
});
test('V3 study tree uses Companion titles without categories and a single generic row otherwise',()=>{
 const companion={pages:{'2':{page:2,title:'Join strategies'}}};
 const rows=fallbackPageRows(3,companion);
 assert.deepEqual(rows.map(r=>[r.page,r.title,!!r.generic]),[[1,'Page 1',true],[2,'Join strategies',false],[3,'Page 3',true]]);
 assert.equal(fallbackPageRows(0).length,0);
});
test('V3 study tree reveals page 190 without rendering every preceding batch',()=>{
 const rows=Array.from({length:400},(_,i)=>({page:i+1}));
 const shown=visibleRowIndexes(rows,80,190);
 assert.equal(shown.filter(i=>i>=0).length,80+9);
 assert(shown.includes(189),'row for page 190 present');
 assert(shown.includes(-1),'elided gap marker present');
 assert(!shown.includes(120),'unrelated batches are not rendered');
 assert.deepEqual(visibleRowIndexes(rows,80,10).length,80,'current inside batch adds nothing');
 // Repeated physical page under the same category: each occurrence revealed.
 const repeated=[...rows,{page:190}];assert(visibleRowIndexes(repeated,80,190).includes(400));
});
test('V3 runtime reader state is per slot/pane and never mixes document revisions',()=>{
 let calls=0;const off=subscribeReaderState(()=>calls++);
 publishPosition({slot:2,paneId:'pane-a',documentId:'doc.x',sha256:'aa',page:7,visible:[7,8],numPages:28});
 publishPosition({slot:2,paneId:'pane-a',documentId:'doc.x',sha256:'aa',page:7,visible:[7,8],numPages:28});
 assert.equal(calls,1,'identical position does not notify');
 assert.equal(positionsForDocument(2,'doc.x','aa').length,1);
 assert.equal(positionsForDocument(2,'doc.x','bb').length,0,'other byte revision');
 assert.equal(positionsForDocument(1,'doc.x','aa').length,0,'other workspace');
 clearPosition(2,'pane-a','doc.other');assert.equal(positionsForDocument(2,'doc.x','aa').length,1,'foreign clear ignored');
 clearPosition(2,'pane-a','doc.x');assert.equal(positionsForDocument(2,'doc.x','aa').length,0);
 publishVerifiedCount('doc.x','aa',28);assert.equal(verifiedPageCount('doc.x','aa'),28);assert.equal(verifiedPageCount('doc.x','bb'),undefined);
 off();
});

const base=()=>{const p=blankPersonal();selectWorkspace(p,1);return p;};
test('V3 cross-tab merge: a stale reading checkpoint cannot erase another tab’s quiz attempt',()=>{
 const b=base();
 const theirs=structuredClone(b);theirs.qcmAttempts=[{id:'attempt.1',setId:'qcm.x',questionId:'q1',attemptNumber:1,selected:['a'],correct:true,answeredAt:5}];
 const ours=structuredClone(b);ours.session.fontSize=b.session.fontSize===16?17:16;
 const {personal,conflicts}=mergePersonal(b,ours,theirs,{preferTheirs:true});
 assert.equal(personal.qcmAttempts.length,1);assert.equal(personal.session.fontSize,ours.session.fontSize);assert.deepEqual(conflicts,[]);
});
test('V3 cross-tab merge: disjoint workspace slots and records both survive; deletions respected',()=>{
 const b=base();selectWorkspace(b,3);selectWorkspace(b,1);
 b.bookmarks=[{id:'bm.keep',pageId:'p.a',title:'A',createdAt:1},{id:'bm.gone',pageId:'p.b',title:'B',createdAt:2}];
 const ours=structuredClone(b),theirs=structuredClone(b);
 ours.session.fontSize=19;ours.bookmarks.push({id:'bm.ours',pageId:'p.c',title:'C',createdAt:3});
 theirs.workspaceSlots[3].fontSize=15;theirs.bookmarks=theirs.bookmarks.filter(x=>x.id!=='bm.gone');theirs.activeWorkspaceSlot=3;
 const {personal}=mergePersonal(b,ours,theirs);
 assert.equal(personal.session.fontSize,19);assert.equal(personal.workspaceSlots[3].fontSize,15);
 assert.deepEqual(personal.bookmarks.map(x=>x.id),['bm.keep','bm.ours']);
 assert.equal(personal.activeWorkspaceSlot,1,'this tab keeps its own active slot');
});
test('V3 cross-tab merge: same-slot conflict winner follows write kind',()=>{
 const b=base(),ours=structuredClone(b),theirs=structuredClone(b);ours.session.fontSize=20;theirs.session.fontSize=14;
 assert.equal(mergePersonal(b,ours,theirs,{preferTheirs:true}).personal.session.fontSize,14,'checkpoint yields');
 const explicit=mergePersonal(b,ours,theirs);assert.equal(explicit.personal.session.fontSize,20,'explicit action wins');assert.deepEqual(explicit.conflicts,['session']);
 assert.equal(mergePersonal(b,b,theirs).personal.session.fontSize,14,'unchanged tab adopts theirs');
});

test('V3 asset resolver lifecycle: 24 lifetimes retain no archive listeners or object URLs',async()=>{
 const {assetResolver}=await import('../dist-offline/app/app/assets.js');
 const {archiveListenerCount,clearArchiveAttachments}=await import('../dist-offline/app/durability/registry.js');
 const {store}=await import('../dist-offline/app/storage/database.js');
 const live=new Set();let next=0;const created=URL.createObjectURL,revoked=URL.revokeObjectURL;
 URL.createObjectURL=()=>{const id='blob:v3-'+(++next);live.add(id);return id;};URL.revokeObjectURL=id=>{live.delete(id);};
 try{
  store.state={...store.state,assets:[{key:'fixture',bytes:new Uint8Array([1,2,3]),mediaType:'application/octet-stream',sha256:''}]};
  const before=archiveListenerCount();
  for(let i=0;i<24;i++){const a=assetResolver({assets:[]},()=>({packs:[],owners:{}}));assert.equal(a.url('fixture'),a.url('fixture'));a.dispose();a.dispose();}
  assert.equal(archiveListenerCount(),before,'no retained archive listeners');
  assert.equal(live.size,0,'every owned object URL revoked');
  // A disposed resolver that is used again (StrictMode re-mount) re-owns cleanly.
  const again=assetResolver({assets:[]},()=>({packs:[],owners:{}}));again.dispose();again.url('fixture');
  assert.equal(archiveListenerCount(),before+1);clearArchiveAttachments();assert.equal(live.size,1,'in-use URL kept while asset still stored');
  again.dispose();assert.equal(archiveListenerCount(),before);assert.equal(live.size,0);
 }finally{URL.createObjectURL=created;URL.revokeObjectURL=revoked;store.state={...store.state,assets:[]};}
});
