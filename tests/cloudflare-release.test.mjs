/** Pure local negative/contract tests, not deployment or live Access qualification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validateReleaseProof,distributionHash,TARGET_CONFIGS} from '../tools/cloudflare-release-guard.mjs';
import {validateCloudflareConfig} from '../tools/provider-access-contract.mjs';
import {qualificationStatus} from '../tools/qualification-status.mjs';
import {releaseArguments} from '../tools/cloudflare-release-command.mjs';
import {V23_GATES} from '../tools/v23-release-contract.mjs';
const now=Date.now(),source={sourceCommit:'a'.repeat(40),sourceHash:'b'.repeat(64),sourceTree:'c'.repeat(40),sourceDirty:false};
const accountId='d'.repeat(32),distHash='e'.repeat(64),build={status:'PASS'};
const proof={schemaVersion:1,target:'qa',workerName:'atlasnote-v23-qa',accountId,sourceCommit:source.sourceCommit,sourceHash:source.sourceHash,distributionHash:distHash,checkedAt:new Date(now-1000).toISOString(),access:{applicationId:'unit-application',workerOrigin:'https://atlasnote-v23-qa.unit.workers.dev/',ownerAccess:true,ownerPolicyReviewed:true,anonymousRootRejected:true,anonymousStaticRejected:true,anonymousDeepLinkRejected:true,policyReviewed:true,versionPreviewCovered:true}};
const check=(changes={})=>validateReleaseProof({target:'qa',proof:structuredClone(proof),source,accountId,distHash,build,now,...changes});
test('Explicit targets remain distinct and preserve blocking custom builds',()=>{
 for(const [target,file] of Object.entries(TARGET_CONFIGS)){
  const config=JSON.parse(fs.readFileSync(file,'utf8'));assert(validateCloudflareConfig(config,{target}));assert.throws(()=>validateCloudflareConfig({...config,build:undefined},{target}));
 }
});
test('Complete local QA attestation passes without claiming live proof',()=>assert.equal(check().scope,'local preflight attestation only'));
for(const [label,changes] of [
 ['default target',{target:'local'}],['missing proof',{proof:undefined}],['wrong target',{proof:{...proof,target:'production'}}],
 ['wrong worker',{proof:{...proof,workerName:'atlasnote'}}],['wrong account',{accountId:'f'.repeat(32)}],
 ['missing explicit account',{accountId:undefined}],['dirty source',{source:{...source,sourceDirty:true}}],
 ['build blocked',{build:{status:'BLOCKED'}}],['different source bytes',{source:{...source,sourceHash:'x'}}],
 ['different commit',{source:{...source,sourceCommit:'x'}}],['changed dist',{distHash:'x'}],
 ['stale inspection',{proof:{...proof,checkedAt:new Date(now-3600001).toISOString()}}],
 ['future inspection',{proof:{...proof,checkedAt:new Date(now+1).toISOString()}}],
 ['unprotected preview',{proof:{...proof,access:{...proof.access,versionPreviewCovered:false}}}],
 ['owner policy unchecked',{proof:{...proof,access:{...proof.access,ownerPolicyReviewed:false}}}],
 ['anonymous static exposed',{proof:{...proof,access:{...proof.access,anonymousStaticRejected:false}}}],
 ['other hostname',{proof:{...proof,access:{...proof.access,workerOrigin:'https://atlasnote.unit.workers.dev/'}}}]
])test('QA fails closed: '+label,()=>assert.throws(()=>check(changes)));
test('Production requires same-source full V23, approval, rollback and exact reviewed bytes',()=>{
 const production={...proof,target:'production',workerName:'atlasnote',access:{...proof.access,workerOrigin:'https://atlasnote.unit.workers.dev/'},ownerApproval:{sourceCommit:source.sourceCommit,distributionHash:distHash,reference:'unit test authorization, not live permission'},rollbackVersionId:'12345678-1234-4abc-8def-1234567890ab'};
 const prerequisite={...source,scope:'full-v23',provider:'cloudflare',runId:'unit-run',status:'READY FOR COORDINATOR QA',startedAt:new Date(now-2000).toISOString(),finishedAt:new Date(now-1000).toISOString(),results:V23_GATES.map(id=>({id,status:'PASS',exitCode:0,sourceHash:source.sourceHash,sourceDrift:false}))};
 const publicationReview={packs:{'unit.pending':{sha256:'pack-hash',review:'OWNER REVIEW REQUIRED'}}},publishedPacks=[{manifest:{id:'unit.pending'},hash:'pack-hash'}];
 production.publicationApprovals=[{packId:'unit.pending',sha256:'pack-hash',reference:'separate unit publication approval'}];
 const options={target:'production',proof:production,prerequisite,publicationReview,publishedPacks};assert.equal(check(options).target,'production');
 for(const change of [{prerequisite:undefined},{prerequisite:{...prerequisite,scope:'portable-core'}},{prerequisite:{...prerequisite,results:prerequisite.results.slice(1)}},{proof:{...production,ownerApproval:undefined}},{proof:{...production,ownerApproval:{...production.ownerApproval,distributionHash:'changed'}}},{proof:{...production,rollbackVersionId:undefined}}])assert.throws(()=>check({...options,...change}));
 assert.throws(()=>check({...options,proof:{...production,publicationApprovals:[]}}),/Separate explicit owner publication approval/);
 assert.throws(()=>check({...options,proof:{...production,publicationApprovals:[{packId:'unit.pending',sha256:'different',reference:'wrong pack'}]}}));
 assert.throws(()=>check({...options,publishedPacks:[{manifest:{id:'unit.pending'},hash:'changed'}]}));
 assert.equal(check({...options,publishedPacks:[],proof:{...production,publicationApprovals:[]}}).target,'production');
 assert.throws(()=>check({...options,proof:{...production,access:{...production.access,ownerAccess:false}}}),/Actual successful owner browser access/);
});
test('Protected QA preview upload may precede owner browser login without claiming it passed',()=>{
 assert.equal(check({proof:{...proof,access:{...proof.access,ownerAccess:false}}}).status,'PASS');
});
test('Distribution fingerprint detects changes to assets as well as build identity',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-release-'));try{
  fs.writeFileSync(path.join(dir,'build-identity.json'),'identity');fs.writeFileSync(path.join(dir,'app.js'),'initial');
  const before=distributionHash(dir);fs.writeFileSync(path.join(dir,'app.js'),'changed');assert.notEqual(distributionHash(dir),before);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('Generic/default release guard refuses before reading credentials or invoking Wrangler',()=>{
 const result=spawnSync(process.execPath,['tools/cloudflare-release-guard.mjs','--target','local'],{encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/deployment is disabled/);
});
test('Portable-only success reports BLOCKED; only complete qualification reports PASS',()=>{
 assert.equal(qualificationStatus('success','success').status,'PASS');
 for(const full of ['skipped','cancelled','missing'])assert.equal(qualificationStatus('success',full).status,'BLOCKED');
 assert.equal(qualificationStatus('success','failure').status,'FAIL');assert.equal(qualificationStatus('failure','skipped').status,'FAIL');
});
test('QA wrapper uploads preview versions only, production uses its own config, and overrides are rejected',()=>{
 assert.deepEqual(releaseArguments('qa','release'),['versions','upload','--config','wrangler.qa.jsonc']);
 assert.deepEqual(releaseArguments('production','release'),['deploy','--config','wrangler.production.jsonc']);
 assert.deepEqual(releaseArguments('qa','dry-run'),['deploy','--dry-run','--config','wrangler.qa.jsonc']);
 assert.throws(()=>releaseArguments('local','release'));assert.throws(()=>releaseArguments('qa','deploy'));
 const result=spawnSync(process.execPath,['tools/cloudflare-release-command.mjs','--target','qa','--mode','release','--name','atlasnote'],{encoding:'utf8'});
 assert.equal(result.status,2);assert.match(result.stderr,/extra flags are forbidden/);
});
test('Inherited CI cannot start on reusable success without full result or same-source proof',()=>{
 const ci=fs.readFileSync('.github/workflows/ci.yml','utf8'),qa=fs.readFileSync('.github/workflows/v23-qualification.yml','utf8');
 assert.match(ci,/needs\.v23-prerequisite\.outputs\.qualification_status == 'PASS'/);
 assert(ci.indexOf('node tools/assert-v23-prerequisite.mjs')<ci.indexOf('npm test'));
 assert.match(ci,/name: atlasnote-v23-full-release/);assert.match(qa,/if: always\(\)\n    needs: \[portable-core, full-v23\]/);
});
