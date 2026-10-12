/** Local preflight only. Operator evidence is an attestation, never live Access proof. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {checkCandidateBuild,sourceIdentity,sourceHash} from './check-v23-build.mjs';
import {acceptsInheritedPrerequisite} from './inherited-prerequisite.mjs';
import {validateCloudflareConfig} from './provider-access-contract.mjs';

export const TARGET_CONFIGS=Object.freeze({local:'wrangler.jsonc',qa:'wrangler.qa.jsonc',production:'wrangler.production.jsonc'});
export function distributionHash(directory='dist'){
 const digest=createHash('sha256');
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{
  const p=path.join(dir,e.name);assert(!e.isSymbolicLink(),'Distribution symlinks are forbidden');return e.isDirectory()?walk(p):[p];
 });
 for(const file of walk(directory)){const bytes=fs.readFileSync(file),name=path.relative(directory,file).replaceAll('\\','/');digest.update(name+'\0'+bytes.length+'\0');digest.update(bytes);}
 return digest.digest('hex');
}
export function validateReleaseProof({target,proof,source,build,distHash,accountId,prerequisite,publicationReview,publishedPacks,now=Date.now()}){
 assert(target==='qa'||target==='production','Default/local Wrangler deployment is disabled. Use npm run dev for local work and an explicit reviewed QA/production config.');
 assert.equal(proof?.schemaVersion,1,'Missing release preflight attestation');
 assert.equal(proof.target,target,'Preflight belongs to another target');
 assert.equal(proof.workerName,target==='qa'?'atlasnote-v23-qa':'atlasnote','Wrong Worker');
 assert.match(accountId??'',/^[a-f0-9]{32}$/i,'Explicit CLOUDFLARE_ACCOUNT_ID required');
 assert.equal(proof.accountId,accountId,'Account differs from the verified target');
 assert.equal(source.sourceDirty,false,'Freeze a clean source before uploading');
 assert.equal(build.status,'PASS','Exact clean integrated candidate build required');
 assert.equal(proof.sourceCommit,source.sourceCommit,'Attestation commit differs');
 assert.equal(proof.sourceHash,source.sourceHash,'Attestation source bytes differ');
 assert.equal(proof.distributionHash,distHash,'Distribution changed since review');
 const checked=Date.parse(proof.checkedAt);assert(Number.isFinite(checked)&&checked<=now&&now-checked<=3600000,'Target/Access inspection must be within one hour');
 const access=proof.access;assert(typeof access?.applicationId==='string'&&access.applicationId.length>0,'Access application inspection required');
 const origin=new URL(access.workerOrigin);assert.equal(origin.protocol,'https:');assert.equal(origin.origin+'/',origin.href,'Exact Worker origin required');
 assert(origin.hostname.startsWith(proof.workerName+'.')&&origin.hostname.endsWith('.workers.dev'),'Worker origin differs from target');
 for(const key of ['anonymousRootRejected','anonymousStaticRejected','anonymousDeepLinkRejected','policyReviewed'])assert.equal(access[key],true,'Access evidence missing: '+key);
 if(target==='qa'){
  assert.equal(access.versionPreviewCovered,true,'Access policy must cover QA version previews before upload');
  assert.equal(access.ownerPolicyReviewed,true,'Review the exact owner allow policy before uploading QA; owner browser login remains a separate qualification check');
 }
 if(target==='production'){
  assert.equal(access.ownerAccess,true,'Actual successful owner browser access is required before production');
  assert(acceptsInheritedPrerequisite(prerequisite,source,now),'Fresh complete same-source V23 qualification required');
  assert.equal(proof.ownerApproval?.sourceCommit,source.sourceCommit,'Explicit production owner approval for this commit required');
  assert.equal(proof.ownerApproval?.distributionHash,distHash,'Approval must name the exact distribution');
  assert(typeof proof.ownerApproval?.reference==='string'&&proof.ownerApproval.reference.trim(),'Record the explicit owner authorization reference');
  assert.match(proof.rollbackVersionId??'',/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,'Exact rollback version required');
  assert(Array.isArray(publishedPacks)&&publicationReview?.packs,'Inspect publication review and exact built packs before production');
  for(const pack of publishedPacks){
   const id=pack.manifest?.id,review=publicationReview.packs[id];
   assert(review&&review.sha256===pack.hash,'Missing or stale pack publication review: '+id);
   if(/OWNER REVIEW REQUIRED/i.test(review.review??'')){
    const approval=proof.publicationApprovals?.find(entry=>entry.packId===id&&entry.sha256===pack.hash);
    assert(approval&&typeof approval.reference==='string'&&approval.reference.trim(),'Separate explicit owner publication approval required: '+id);
   }
  }
 }
 return {status:'PASS',scope:'local preflight attestation only',target,workerName:proof.workerName,sourceCommit:source.sourceCommit,distributionHash:distHash};
}
export function runReleaseGuard(target){
 assert(Object.hasOwn(TARGET_CONFIGS,target??''),'Explicit --target local|qa|production required');
 validateCloudflareConfig(JSON.parse(fs.readFileSync(TARGET_CONFIGS[target],'utf8')),{target});
 assert.notEqual(target,'local','Default/local Wrangler deployment is disabled. Use npm run dev.');
 assert(process.env.ATLAS_CF_RELEASE_PROOF,'ATLAS_CF_RELEASE_PROOF must name a fresh operator-reviewed local attestation; no default authorization exists.');
 const proof=JSON.parse(fs.readFileSync(process.env.ATLAS_CF_RELEASE_PROOF,'utf8'));
 const source={...sourceIdentity(),sourceHash:sourceHash()},build=checkCandidateBuild();
 const prerequisite=target==='production'?JSON.parse(fs.readFileSync('docs/evidence/v23/release/results.json','utf8')):undefined;
 const publicationReview=target==='production'?JSON.parse(fs.readFileSync('content/publication-review.json','utf8')):undefined;
 const publishedPacks=target==='production'?JSON.parse(fs.readFileSync('dist/content.json','utf8')).packs:undefined;
 return validateReleaseProof({target,proof,source,build,distHash:distributionHash(),accountId:process.env.CLOUDFLARE_ACCOUNT_ID,prerequisite,publicationReview,publishedPacks});
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{assert.equal(process.argv.length,4,'Use --target local|qa|production');assert.equal(process.argv[2],'--target');console.log(JSON.stringify(runReleaseGuard(process.argv[3]),null,2));}
 catch(error){console.error('BLOCKED: '+error.message);process.exitCode=2;}
}
