// Pure source-level reachability/planning tests; no IndexedDB atomicity claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {liveAssetReachability,planCompaction} from '../src/durability/archive.mjs';
import {revisionIdentity} from '../src/durability/descriptor.mjs';
import {validateHistory,validateResourceSnapshot} from '../src/history/validation.mjs';
import {sha256,stable} from '../src/core/validation.mjs';

async function fixture(status='staged',spanning=false){
 const assets=await Promise.all(['protected','removable'].map(async name=>{const bytes=new TextEncoder().encode(name);return {key:name+'.txt',mediaType:'text/plain',bytes,sha256:await sha256(bytes)};}));
 const snapshot={project:{id:'tree.test',title:'Test',icon:'book',description:'',nodes:[]}};
 const ref=a=>({key:a.key,sha256:a.sha256,mediaType:a.mediaType});
 const revisions=await Promise.all([0,1,2].map(async i=>{const s={...snapshot,...(i<2?{assetRefs:{'fixture.txt':ref(assets[i])}}:{})};return {kind:'revision',schemaVersion:1,revisionId:'revision.'+i,resourceKey:'notebook-tree:tree.test',resourceId:'tree.test',resourceType:'notebook-tree',number:i+1,parentRevisionId:i?'revision.'+(i-1):null,createdAt:i,source:'manual',summary:'',status:'committed',contentHash:await sha256(stable(s)),snapshot:s,...(spanning&&i!==1?{changeSetId:'review.keep'}:{})};}));
 const proposed={...snapshot,assetRefs:{'fixture.txt':ref(assets[0])}};
 validateResourceSnapshot('notebook-tree',proposed);
 const review={kind:'review',schemaVersion:1,id:'review.keep',status,createdAt:1,...(status!=='staged'?{decidedAt:2}:{}),plan:{kind:'atlas-agent-changeset',schemaVersion:1,id:'review.keep',createdAt:1,source:'test',operations:[{id:'op.update',kind:'resource.update',resourceKey:'notebook-tree:tree.test',baseRevisionId:'revision.2',payload:{resourceType:'notebook-tree',snapshot:proposed}}]},...(spanning?{revisionIds:['revision.0','revision.2']}:{})};
 const last=revisions[2],history={schemaVersion:1,meta:{kind:'meta',schemaVersion:1,epoch:4,initialized:true,baselineRelease:'2.3.0',baselineCommit:'a'.repeat(40)},heads:[{kind:'head',schemaVersion:1,resourceKey:last.resourceKey,revisionId:last.revisionId,number:last.number,contentHash:last.contentHash}],revisions,reviews:[review]};
 const ws={assets,imports:[],overlays:{},personal:{},history};
 await validateHistory(history,assets,true);
 return {ws,review,snapshot};
}

// Supply the planner's verified-archive shape directly; ZIP verification is outside
// this regression's scope. History and descriptor validation still run normally.
async function plan(ws){
 const revisions=ws.history.revisions.slice(0,2),assets=ws.assets;
 const descriptor={kind:'archive',schemaVersion:1,archiveSchema:1,archiveId:'archive.test',rootHash:'b'.repeat(64),createdAt:10,provenance:{appVersion:'2.3.0',sourceCommit:'a'.repeat(40),sourceHash:'c'.repeat(64),sourceDirty:false,databaseVersion:3,pdfAtlasCommit:'d'.repeat(40),buildKind:'integrated'},sourceEpoch:ws.history.meta.epoch,sourceHistoryHash:await sha256(stable(ws.history)),ranges:[{resourceKey:revisions[0].resourceKey,previous:null,revisions:revisions.map(revisionIdentity)}],assets:assets.map((a,i)=>({key:a.key,sha256:a.sha256,mediaType:a.mediaType,bytes:a.bytes.length,path:'assets/'+String(i).padStart(5,'0')+'.txt'})),reviews:[],counts:{revisions:2,reviews:0,assets:2,assetBytes:assets.reduce((n,a)=>n+a.bytes.length,0),structuredBytes:0}};
 return planCompaction(ws,{descriptor,revisions,reviews:[],assets});
}

for(const status of ['staged','accepted','rejected','stale'])test(status+' retained plan protects its sole asset reference; unrelated historical asset remains removable',async()=>{
 const {ws}=await fixture(status),before=structuredClone(ws),result=await plan(ws);
 assert.deepEqual(result.preview.assetKeys,['removable.txt']);
 assert.deepEqual(result.workspace.history.reviews,ws.history.reviews);
 assert.deepEqual(ws,before);
});

for(const status of ['accepted','rejected','stale'])test(status+' spanning audit protects referenced archived revision bytes',async()=>{
 const {ws,review,snapshot}=await fixture(status,true);
 review.plan.operations[0].payload.snapshot=snapshot; // No direct asset reference.
 const result=await plan(ws);
 assert.deepEqual(result.preview.assetKeys,['removable.txt']);
 assert.deepEqual(result.workspace.history.reviews,[review]);
});

test('restore and pinned historical targets protect indirectly referenced bytes',async()=>{
 for(const operation of [
  {kind:'resource.restoreAsNewRevision',resourceKey:'notebook-tree:tree.test',baseRevisionId:'revision.2',payload:{revisionId:'revision.0'}},
  {kind:'bookmark.add',baseFingerprint:'a'.repeat(16),payload:{title:'Old tree',target:{kind:'collection',collectionId:'tree.test',historyRevisionId:'revision.0'}}}
 ]){
  const {ws,review}=await fixture();review.plan.operations=[{id:'op.restore',...operation}];
  assert.deepEqual((await plan(ws)).preview.assetKeys,['removable.txt']);
 }
});

test('nested PDF keys, SHA-only aliases, and unselected operations are protected',async()=>{
 const {ws,review}=await fixture(),asset=ws.assets[0];
 for(const snapshot of [{document:{assetKey:asset.key}},{document:{sha256:asset.sha256}},{pdfProvenance:{sha256:asset.sha256}},{assetRefs:{image:{key:'absent-alias',sha256:asset.sha256}}}]){
  review.selectedOperationIds=[];
  review.plan.operations[0].payload.snapshot=snapshot;
  const reach=liveAssetReachability(ws,ws.history.revisions.slice(2));
  assert(reach.keys.has(asset.key)||reach.hashes.has(asset.sha256));
  assert(!reach.keys.has(ws.assets[1].key)&&!reach.hashes.has(ws.assets[1].sha256));
 }
});

test('without retained review ownership both historical-only assets remain removable',async()=>{
 const {ws}=await fixture();ws.history.reviews=[];
 assert.deepEqual((await plan(ws)).preview.assetKeys,['protected.txt','removable.txt']);
});
