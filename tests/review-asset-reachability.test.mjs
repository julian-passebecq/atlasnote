import test from 'node:test';
import assert from 'node:assert/strict';
import {liveAssetReachability} from '../dist-offline/app/durability/archive.mjs';

const asset=(key,sha256)=>({key,sha256,mediaType:'application/pdf',bytes:new Uint8Array([1,2,3])});
const baseWorkspace=()=>({
  imports:[],overlays:{},personal:{},assets:[
    asset('asset/review-only.pdf','a'.repeat(64)),
    asset('asset/revision-only.pdf','b'.repeat(64)),
    asset('asset/orphan.pdf','c'.repeat(64)),
  ],
  history:{revisions:[
    {revisionId:'rev.old',snapshot:{document:{assetKey:'asset/revision-only.pdf',sha256:'b'.repeat(64)}}},
  ],reviews:[]},
});

test('retained staged review protects embedded snapshot asset key and hash',()=>{
  const ws=baseWorkspace();
  const reviews=[{status:'staged',plan:{operations:[{kind:'resource.update',payload:{snapshot:{
    assetRefs:{pdf:{key:'asset/review-only.pdf',sha256:'a'.repeat(64),mediaType:'application/pdf'}},
    pdfProvenance:{sha256:'a'.repeat(64)}
  }}}]}}];
  const reach=liveAssetReachability(ws,[],[],[],reviews);
  assert.equal(reach.keys.has('asset/review-only.pdf'),true);
  assert.equal(reach.hashes.has('a'.repeat(64)),true);
});

test('retained review protects assets through referenced historical revision identities',()=>{
  const ws=baseWorkspace();
  const reviews=[{status:'accepted',revisionIds:['rev.old'],plan:{operations:[{kind:'resource.restoreAsNewRevision',payload:{revisionId:'rev.old'}}]}}];
  const reach=liveAssetReachability(ws,[],[],[],reviews);
  assert.equal(reach.keys.has('asset/revision-only.pdf'),true);
  assert.equal(reach.hashes.has('b'.repeat(64)),true);
});

test('unreferenced historical orphan remains unprotected',()=>{
  const ws=baseWorkspace();
  const reach=liveAssetReachability(ws,[],[],[],[]);
  assert.equal(reach.keys.has('asset/orphan.pdf'),false);
  assert.equal(reach.hashes.has('c'.repeat(64)),false);
});
