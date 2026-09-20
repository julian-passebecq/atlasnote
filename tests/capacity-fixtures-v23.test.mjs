/** Pure fixture tests; never a substitute for test:v23:capacity's real browser. */
import test from 'node:test';import assert from 'node:assert/strict';
import {buildCapacityFixture} from './v23/capacity-fixtures.mjs';
import {demoWorkspace,built,compose} from './v23/fixtures.mjs';
import {validateHistory} from '../dist-offline/app/history/validation.mjs';
import {assertProjection,advanceHistory} from '../dist-offline/app/history/engine.js';
import {CAPACITY_BOUNDARIES} from '../tools/v23-release-contract.mjs';
for(const boundary of CAPACITY_BOUNDARIES)test('V23 valid exact-boundary fixture: '+boundary,async()=>{
 const original=await demoWorkspace(),fixture=await buildCapacityFixture(original,boundary),ws=fixture.workspace;
 await validateHistory(ws.history);await assertProjection(compose(built,ws),ws);
 assert.deepEqual(ws.assets,original.assets);assert.deepEqual(ws.personal,original.personal);
 assert.equal(ws.history.reviews.find(r=>r.id===fixture.pendingId).status,'staged');
 assert.ok(!original.history.heads.some(h=>h.resourceKey===fixture.resourceKey),'Fixture must not mutate the caller');
 const expected={'2000-revisions-per-resource':['perResource',2000],'25000-total-revisions':['total',25000],'500-review-rows':['reviews',500],'64-MiB-structured-history':['bytes',64*1024*1024]}[boundary];
 assert.equal(fixture.counts[expected[0]],expected[1]);
 if(boundary==='500-review-rows'){
  const overflow=structuredClone(ws.history),row=overflow.reviews.find(r=>r.status==='rejected');
  overflow.reviews.push({...row,id:'qa.review.overflow',plan:{...row.plan,id:'qa.review.overflow'}});
  await assert.rejects(validateHistory(overflow),/History count limit/);
 }else{
  const head=ws.history.heads.find(h=>h.resourceKey===fixture.resourceKey),old=ws.history.revisions.find(r=>r.revisionId===head.revisionId);
  const resource={resourceType:old.resourceType,resourceId:old.resourceId,resourceKey:old.resourceKey,snapshot:structuredClone(old.snapshot)};
  resource.snapshot.page.title+=' next';
  await assert.rejects(advanceHistory(ws.history,[resource],{source:'manual'}),/history is full|64 MiB/);
 }
});
