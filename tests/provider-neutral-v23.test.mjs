import {acceptsInheritedPrerequisite} from '../tools/inherited-prerequisite.mjs';
/** Pure/local regression tests. No fixture in this file is live provider evidence. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {ACTIVE_PROVIDER,SECURITY_HEADERS,CACHE_HEADERS,validateCloudflareConfig,validateStaticHeaders,previewOrigin,validatePreviewMetadata,scopedServiceHeaders,headersAreSafe,isProtectedResponse,secretFreeText,freshProviderEvidence,containsCredential} from '../tools/provider-access-contract.mjs';
import {V23_GATES,PROVIDER_CASES,COMPACTION_FAULTS,BASE_COMMIT,BASE_TREE} from '../tools/v23-release-contract.mjs';
import {PROVIDER_CASES as LEGACY_CASES} from '../tools/legacy-netlify-contract.mjs';
import {checkAccessBuild} from '../tools/check-access-build.mjs';
import {secretRules} from '../tools/check-v23-secrets.mjs';
const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8')),headerText=fs.readFileSync('public/_headers','utf8');

test('Cloudflare config is minimal Worker Static Assets SPA with preview URLs',()=>validateCloudflareConfig(config));
test('Cloudflare static headers preserve the provider-neutral security/cache policy',()=>validateStaticHeaders(headerText));
for(const key of Object.keys({...SECURITY_HEADERS,...CACHE_HEADERS}))test('Required '+key+' cannot be dropped or weakened',()=>{
 const changed=headerText.split(/\r?\n/).filter(line=>!line.toLowerCase().includes(key+':')).join('\n');assert.throws(()=>validateStaticHeaders(changed));
});
for(const change of [
 {workers_dev:false},{preview_urls:false},{name:'AtlasNote Bad'},
 {assets:{directory:'./public',not_found_handling:'single-page-application'}},
 {assets:{directory:'./dist',not_found_handling:'404-page'}},{main:'src/worker.ts'},{routes:[]}
])test('Reject Cloudflare config drift '+Object.keys(change).join(','),()=>assert.throws(()=>validateCloudflareConfig({...config,...change})));
test('Reject security-header override rules and public caching',()=>{
 assert.throws(()=>validateStaticHeaders(headerText+'\n/assets/*\n  Cache-Control: public, max-age=3600\n'));
 assert.throws(()=>validateStaticHeaders(headerText.replace('private, no-store, max-age=0','public, max-age=3600')));
});
test('Active build has no provider credential material in client graph',async()=>{const report=await checkAccessBuild();assert.equal(report.status,'PASS');assert.equal(report.provider,'cloudflare');assert.doesNotMatch(fs.readFileSync('tools/check-access-build.mjs','utf8'),/from .*netlify|import\(.*netlify/);});
test('Vercel root config is retired while historical copy remains reviewable',()=>{assert.equal(fs.existsSync('vercel.json'),false);assert(fs.existsSync('docs/history/vercel-provider-20260920/vercel.json'));});
test('Root-relative Vite assets survive nested SPA URLs',()=>{assert.match(fs.readFileSync('vite.config.mjs','utf8'),/base:'\/'/);const nested='https://abcd-atlasnote-v23-qa.example.workers.dev/workspace/5/history/old';assert.equal(new URL('/assets/main.js',nested).pathname,'/assets/main.js');assert.notEqual(new URL('./assets/main.js',nested).pathname,'/assets/main.js');});
test('Managed access UI never submits legacy logout and never claims to sign out',()=>{const s=fs.readFileSync('src/durability/DurabilityPanel.tsx','utf8');assert.doesNotMatch(s,/form action="\/__atlasnote_lock"/);assert.match(s,/This button does not lock the app or sign you out/);assert.match(s,/await store\.flush\(\);if\(store\.unsafeClose\)/);assert.match(s,/atlas:before-reader-change/);});
test('Core safe-close retains native queued write, unload, emergency export and retry',()=>{const s=fs.readFileSync('tests/v23_qualification.py','utf8');for(const word of ['beforeunload','__qaHoldPersonal','Download raw recovery JSON','Retry saving','page.evaluate(RAW)==before'])assert(s.includes(word));assert(!s.includes('real Netlify HTTPS'));});
test('Source baseline and all 13 compactor faults remain explicit; legacy matrix is not deleted',()=>{assert.equal(BASE_COMMIT,'2ece94b4e07e3179e8aee5dad4b32970c5be2242');assert.equal(BASE_TREE,'1a57e4db16efaf1ee4ac25f52da0462e388c93e9');assert.equal(COMPACTION_FAULTS.length,13);assert.equal(LEGACY_CASES.length,20);assert.equal(PROVIDER_CASES.length,13);assert.equal(ACTIVE_PROVIDER,'cloudflare');});

for(const value of [undefined,'http://abc-atlasnote-v23-qa.foo.workers.dev/','https://example.org/','https://abc-atlasnote-v23-qa.foo.workers.dev/path','https://user:pass@abc-atlasnote-v23-qa.foo.workers.dev/','https://abc-atlasnote-v23-qa.foo.workers.dev/?token=x','https://abc-atlasnote-v23-qa.foo.workers.dev/#secret','https://abc-atlasnote-v23-qa.foo.workers.dev:443/other','https://atlasnote-v23-qa.foo.workers.dev/'])test('Reject unsafe/missing/non-version preview '+String(value),()=>assert.throws(()=>previewOrigin(value,{workerName:'atlasnote-v23-qa'})));
test('Exact Cloudflare Worker version preview origin is accepted',()=>assert.equal(previewOrigin('https://7f31a8-atlasnote-v23-qa.demo.workers.dev/',{workerName:'atlasnote-v23-qa'}),'https://7f31a8-atlasnote-v23-qa.demo.workers.dev'));
const now=Date.now(),versionId='12345678-1234-4abc-8def-1234567890ab';
const meta={id:versionId,number:12,metadata:{created_on:new Date(now-1000).toISOString(),hasPreview:true,source:'wrangler'}};
const options={now,candidateTime:now-5000,workerName:'atlasnote-v23-qa',versionId,activeVersionIds:[]};
const origin='https://7f31a8-atlasnote-v23-qa.demo.workers.dev';
test('Fresh exact preview-only Worker version metadata is accepted',()=>assert.equal(validatePreviewMetadata(meta,origin,options).id,versionId));
for(const change of [
 {id:'not-an-id'},
 {metadata:{...meta.metadata,hasPreview:false}},
 {metadata:{...meta.metadata,created_on:new Date(now-86400001).toISOString()}},
 {metadata:{...meta.metadata,created_on:new Date(now-6000).toISOString()}}
])test('Reject stale/non-preview metadata '+JSON.stringify(change),()=>assert.throws(()=>validatePreviewMetadata({...meta,...change},origin,options)));
test('Reject actively deployed candidate version',()=>assert.throws(()=>validatePreviewMetadata(meta,origin,{...options,activeVersionIds:[versionId]})));
test('Reject wrong Worker or version identity',()=>{assert.throws(()=>validatePreviewMetadata(meta,'https://7f31a8-other.demo.workers.dev',options));assert.throws(()=>validatePreviewMetadata(meta,origin,{...options,versionId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}));});
test('No caller can extend preview freshness beyond 24 hours',()=>assert.throws(()=>validatePreviewMetadata(meta,origin,{...options,maxAgeMs:86400001})));

const fakeId='unit-client-id-123456',fakeSecret='cfast_'+ 'S'.repeat(48);
test('Access service-token headers are scoped to exactly one origin',()=>{const h=scopedServiceHeaders(origin+'/assets/main.js',origin,fakeId,fakeSecret);assert.equal(h['CF-Access-Client-Id'],fakeId);assert.equal(h['CF-Access-Client-Secret'],fakeSecret);});
for(const target of ['https://cloudflare.com/','https://other.example.workers.dev/','http://7f31a8-atlasnote-v23-qa.demo.workers.dev/','https://7f31a8-atlasnote-v23-qa.demo.workers.dev/?x=1'])test('No Access credential can be sent to '+target,()=>assert.throws(()=>scopedServiceHeaders(target,origin,fakeId,fakeSecret)));
for(const status of [401,403])test('Anonymous managed denial '+status+' is observable',()=>assert(isProtectedResponse({status,bodyHash:'denied',appMarker:false},'app')));
for(const p of [{status:200},{status:503},{status:307,redirectToAccess:false},{status:401,bodyHash:'app'},{status:403,appMarker:true}])test('HTTP response is not protection proof '+JSON.stringify(p),()=>assert(!isProtectedResponse(p,'app')));
test('Cloudflare Access redirect counts only when it leads to Access and not app bytes',()=>assert(isProtectedResponse({status:302,redirectToAccess:true,bodyHash:'login',appMarker:false},'app')));
test('Header check requires private no-store, CDN no-store and all security values',()=>{const h={...SECURITY_HEADERS,...CACHE_HEADERS};assert(headersAreSafe(h));assert(!headersAreSafe({...h,'cache-control':'public'}));assert(!headersAreSafe({...h,'cloudflare-cdn-cache-control':'public'}));assert(!headersAreSafe({...h,'x-frame-options':'ALLOWALL'}));});
test('Retained output removes raw and URL-encoded credentials without printing them',()=>{const text='value '+fakeSecret+' '+encodeURIComponent(fakeSecret);const clean=secretFreeText(text,[fakeId,fakeSecret]);assert(!clean.includes(fakeSecret));assert(!clean.includes(fakeId));assert(clean.includes('[REDACTED]'));});
test('Secret scanning catches Cloudflare literals but allows variable names/documentation',()=>{assert.deepEqual(secretRules('CLOUDFLARE_API_TOKEN and CF_ACCESS_CLIENT_SECRET are environment variable names'),[]);assert(secretRules('CF_ACCESS_CLIENT_SECRET='+fakeSecret).includes('literal-cloudflare-credential'));assert(secretRules(fakeSecret).includes('cloudflare-service-secret'));});

const expected={sourceCommit:'unit-commit',sourceHash:'unit-hash',runId:'unit-run',startedAt:new Date(now-1000).toISOString()};
const proof={provider:'cloudflare',status:'PASS',runId:expected.runId,source:{sourceCommit:expected.sourceCommit,sourceHash:expected.sourceHash,sourceDirty:false},startedAt:new Date(now).toISOString(),finishedAt:new Date(now).toISOString(),results:PROVIDER_CASES.map(name=>({name,status:'PASS'}))};
test('Fresh same-run complete provider proof validates',()=>assert(freshProviderEvidence(proof,expected,PROVIDER_CASES)));
for(const change of [{runId:'old-run'},{provider:'vercel'},{source:{...proof.source,sourceCommit:'old'}},{source:{...proof.source,sourceHash:'different-bytes'}},{source:{...proof.source,sourceDirty:true}},{startedAt:new Date(now-5000).toISOString()},{status:'BLOCKED'},{results:proof.results.slice(1)},{results:proof.results.map((r,i)=>i?proof.results[0]:r)}])test('Refuse stale/incomplete/different candidate evidence '+Object.keys(change).join(','),()=>assert(!freshProviderEvidence({...proof,...change},expected,PROVIDER_CASES)));
test('Linux native proof remains real ENOSPC, exact five-store/reload equality, safe cleanup',()=>{const s=fs.readFileSync('tests/v23_native_quota.py','utf8');for(const value of ['FILE_ERROR_NO_SPACE','errno.ENOSPC','before==after==reopened','os.path.ismount','256*1024*1024','temporaryDirectoryRemoved','Debugger.setBreakpointByUrl'])assert(s.includes(value),value);assert(!s.includes('setQuotaOverride'));});
test('Provider probe has no hard-coded historical target, follows no auth redirects, records no response body',()=>{const s=fs.readFileSync('tests/v23_access_preview.mjs','utf8');assert(!s.includes('deploy-preview-18'));assert(s.includes("redirect:'manual'"));assert(s.includes('safeHeaders'));assert(s.includes('CF_ACCESS_CLIENT_SECRET'));assert(s.includes('/workers/scripts/'));});

test('Root HTML base resolves content, schemas, PDF workers and vendor scripts on deep links',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/<base href="\/">/);assert(html.indexOf('<base ')<html.indexOf('<script '));
 const deep=new URL('/workspace/5/history/old',origin),base=new URL('/',deep);
 for(const name of ['content.json','app/content/schemas/article.schema.json','pdf-assets/pdf.worker.min.mjs','app/vendor/jszip.js','assets/atlas.svg'])assert.equal(new URL(name,base).href,origin+'/'+name);
 assert(fs.readFileSync('tools/build.mjs','utf8').includes('<base href="/">'));
});
test('Inherited workflow is gated by full V23, not merely the portable core',()=>{
 const ci=fs.readFileSync('.github/workflows/ci.yml','utf8'),qa=fs.readFileSync('.github/workflows/v23-qualification.yml','utf8');
 assert(ci.includes('needs: v23-prerequisite'));assert(ci.includes('uses: ./.github/workflows/v23-qualification.yml'));assert(qa.includes('ATLAS_V23_NATIVE_QUOTA'));assert(qa.includes('npm run test:v23:release'));assert(!qa.includes('wrangler deploy'));assert(!qa.includes('continue-on-error: true'));
});
test('Browser Access credentials are request-scoped with redirect following disabled, not context headers',()=>{
 const code=fs.readFileSync('tests/v23_provider_browser.py','utf8');assert(code.includes('route.fetch(headers=headers,max_redirects=0'));assert(!code.includes('extra_http_headers'));assert(!code.includes('storage_state='));assert(!code.includes('record_har_path'));
});

const inheritedSource={sourceCommit:'unit-sha',sourceHash:'unit-source',sourceTree:'unit-tree',sourceDirty:false};
const inheritedReport={...inheritedSource,runId:'unit-run',provider:'cloudflare',scope:'full-v23',status:'READY FOR COORDINATOR QA',startedAt:new Date(now-1000).toISOString(),finishedAt:new Date(now).toISOString(),results:V23_GATES.map(id=>({id,status:'PASS',exitCode:0,sourceHash:inheritedSource.sourceHash,sourceDrift:false}))};
test('Only exact fully green fresh V23 unlocks inherited execution',()=>assert(acceptsInheritedPrerequisite(inheritedReport,inheritedSource,now)));
for(const change of [{finishedAt:new Date(now+1).toISOString()},{finishedAt:new Date(now-3600001).toISOString()},{startedAt:new Date(now+1).toISOString()},{scope:'portable-core'},{sourceDirty:true},{sourceHash:'other'},{sourceTree:'other'},{provider:'vercel'},{results:inheritedReport.results.slice(1)},{results:inheritedReport.results.map((r,i)=>i?r:{...r,sourceDrift:true})}])test('Inherited runner refuses invalid prerequisite '+Object.keys(change).join(','),()=>assert(!acceptsInheritedPrerequisite({...inheritedReport,...change},inheritedSource,now)));

test('Exact credential scan detects raw and base64 credentials without returning their values',()=>{assert(containsCredential('prefix '+fakeSecret,[fakeId,fakeSecret]));assert(containsCredential(Buffer.from(fakeSecret).toString('base64'),[fakeSecret]));assert(!containsCredential('CF_ACCESS_CLIENT_SECRET identifier only',[fakeSecret]));});
