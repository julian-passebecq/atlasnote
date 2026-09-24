import test from 'node:test';
import assert from 'node:assert/strict';
import {built,authoredFixtures} from './v22/fixtures.mjs';
import {compose} from '../dist-offline/app/core/workspace.js';
import {prepareWorkspaceHistory,changedResources} from '../dist-offline/app/history/engine.js';
import {captureResources} from '../dist-offline/app/history/adapters.js';
import {WorkspaceStore} from '../dist-offline/app/storage/database.js';
import {requireHistoricalRevision,setHistoryComplete,isHistoryComplete} from '../dist-offline/app/durability/registry.js';

const tick=()=>new Promise(r=>setTimeout(r,20));
test('V3 boot reconciliation: an unchanged library sends zero resources through advanceHistory',async()=>{
 const ws=await prepareWorkspaceHistory(built,authoredFixtures(),{source:'migration',summary:'Synthetic baseline'});
 const all=captureResources(compose(built,ws),ws);
 assert(all.length>10);
 assert.deepEqual(await changedResources(ws.history,all),[],'no clone/serialize work for an unchanged library');
 const edited=structuredClone(all);const target=edited.find(r=>r.snapshot.page?.blocks);target.snapshot.page.blocks.push({id:target.snapshot.page.id+'.v3',type:'markdown',text:'changed'});
 assert.deepEqual((await changedResources(ws.history,edited)).map(r=>r.resourceKey),[target.resourceKey]);
 assert.equal((await changedResources(undefined,all)).length,all.length,'first initialization still captures everything');
});
test('V3 staged boot: authored/backup commands wait for the complete state, then run',async()=>{
 const store=new WorkspaceStore();store.setLoaded(structuredClone(authoredFixtures()));
 assert.equal(store.isReady,true,'non-staged callers keep today’s semantics');
 store.beginStagedBoot();assert.equal(store.isReady,false);assert.equal(store.hydrated,false);
 let done=false;const pending=store.backupSnapshot().then(v=>{done=true;return v;});
 await tick();assert.equal(done,false,'backup never snapshots the shell read');
 store.markReady();const snapshot=await pending;assert.equal(done,true);assert(snapshot.overlays);
 setHistoryComplete(true);
});
test('V3 staged boot: a failed hydration fails authored commands closed',async()=>{
 const store=new WorkspaceStore();store.setLoaded(structuredClone(authoredFixtures()));store.beginStagedBoot();
 const pending=store.backupSnapshot();store.markFailed(Error('disk read failed'));
 await assert.rejects(pending,/did not finish loading: disk read failed\. Nothing was changed\./);
 await assert.rejects(store.overlays(()=>{}),/did not finish loading/);
 setHistoryComplete(true);
});
test('V3 staged boot: a revision absent from the shell read is "still loading", never "missing"',()=>{
 const history={schemaVersion:1,meta:{kind:'meta'},heads:[],revisions:[],reviews:[]};
 setHistoryComplete(false);assert.equal(isHistoryComplete(),false);
 assert.throws(()=>requireHistoricalRevision(history,'revision.x'),/still loading/);
 setHistoryComplete(true);
 assert.throws(()=>requireHistoricalRevision(history,'revision.x'),/missing\. Import its full backup/);
});
test('V3 reading checkpoints keep the identity of everything except sessions (no index rebuild per scroll)',async()=>{
 const store=new WorkspaceStore();store.setLoaded(structuredClone(authoredFixtures()));
 const before=store.state.personal,knowledge=before.knowledge,notes=before.notes,bookmarks=before.bookmarks;
 store.checkpoint(p=>{p.session.fontSize=p.session.fontSize===16?17:16;});
 const after=store.state.personal;
 assert.notEqual(after.session,before.session);assert.notEqual(after.session.fontSize,before.session.fontSize);
 assert.equal(after.knowledge,knowledge);assert.equal(after.notes,notes);assert.equal(after.bookmarks,bookmarks);
 assert.equal(before.session.fontSize!==after.session.fontSize,true,'previous state not mutated in place');
 store.flushPending();
});
