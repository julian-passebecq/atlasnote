import {acceptsInheritedPrerequisite} from '../tools/inherited-prerequisite.mjs';
/** Pure/local regression tests. No fixture in this file is live provider evidence. */
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {SECURITY_HEADERS,validateVercelConfig,previewOrigin,validatePreviewMetadata,scopedBypassHeaders,headersAreSafe,isProtectedResponse,secretFreeText,freshProviderEvidence,containsCredential} from '../tools/provider-access-contract.mjs';
import {V23_GATES,PROVIDER_CASES,COMPACTION_FAULTS,BASE_COMMIT,BASE_TREE} from '../tools/v23-release-contract.mjs';
import {PROVIDER_CASES as LEGACY_CASES} from '../tools/legacy-netlify-contract.mjs';
import {checkAccessBuild} from '../tools/check-access-build.mjs';
import {secretRules} from '../tools/check-v23-secrets.mjs';
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
test('Vercel static config is minimal Vite/dist with unchanged install/build contract',()=>validateVercelConfig(config));
for(const key of Object.keys(SECURITY_HEADERS))test('Required '+key+' cannot be dropped or weakened',()=>{
 const changed=structuredClone(config);changed.headers[0].headers=changed.headers[0].headers.filter(h=>h.key.toLowerCase()!==key);assert.throws(()=>validateVercelConfig(changed));
});
for(const change of [{framework:'nextjs'},{outputDirectory:'public'},{installCommand:'npm install'},{buildCommand:'next build'},{routes:[]},{rewrites:[{source:'/(.*)',destination:'/wrong.html'}]},{headers:[]}])test('Reject Vercel config drift '+Object.keys(change).join(','),()=>assert.throws(()=>validateVercelConfig({...config,...change})));
test('Cache headers cannot become public, shared or override security on a subpath',()=>{const c=structuredClone(config);c.headers[0].headers.find(h=>h.key==='Cache-Control').value='public, max-age=3600';assert.throws(()=>validateVercelConfig(c));c.headers.push({source:'/assets/(.*)',headers:[]});assert.throws(()=>validateVercelConfig(c));});
test('Active build has no Netlify imports or custom logout assertion',async()=>{assert.equal((await checkAccessBuild()).status,'PASS');assert.doesNotMatch(fs.readFileSync('tools/check-access-build.mjs','utf8'),/from .*netlify|import\(.*netlify/);});
test('Root-relative Vite assets survive nested SPA URLs',()=>{assert.match(fs.readFileSync('vite.config.mjs','utf8'),/base:'\/'/);const nested='https://preview.vercel.app/workspace/5/history/old';assert.equal(new URL('/assets/main.js',nested).pathname,'/assets/main.js');assert.notEqual(new URL('./assets/main.js',nested).pathname,'/assets/main.js');});
test('Managed access UI never submits legacy logout and never claims to sign out',()=>{const s=fs.readFileSync('src/durability/DurabilityPanel.tsx','utf8');assert.doesNotMatch(s,/form action="\/__atlasnote_lock"/);assert.match(s,/This button does not lock the app or sign you out/);assert.match(s,/await store\.flush\(\);if\(store\.unsafeClose\)/);assert.match(s,/atlas:before-reader-change/);});
test('Core safe-close retains native queued write, unload, emergency export and retry',()=>{const s=fs.readFileSync('tests/v23_qualification.py','utf8');for(const word of ['beforeunload','__qaHoldPersonal','Download raw recovery JSON','Retry saving','page.evaluate(RAW)==before']){assert(s.includes(word));}assert(!s.includes('real Netlify HTTPS'));});
test('Source baseline and all 13 compactor faults remain explicit; legacy matrix is not deleted',()=>{assert.equal(BASE_COMMIT,'2ece94b4e07e3179e8aee5dad4b32970c5be2242');assert.equal(BASE_TREE,'1a57e4db16efaf1ee4ac25f52da0462e388c93e9');assert.equal(COMPACTION_FAULTS.length,13);assert.equal(LEGACY_CASES.length,20);assert.equal(PROVIDER_CASES.length,13);assert(!PROVIDER_CASES.includes('handler-error-fail-closed'));});
for(const value of [undefined,'http://preview.vercel.app/','https://example.org/','https://preview.vercel.app/path','https://user:pass@preview.vercel.app/','https://preview.vercel.app/?token=x','https://preview.vercel.app/#secret','https://preview.vercel.app:443/other','https://deploy-preview-18--atlasnotej.netlify.app/'])test('Reject unsafe/missing preview '+String(value),()=>assert.throws(()=>previewOrigin(value)));
test('Exact Vercel HTTPS origin allowed only as input, not as proof of preview target',()=>assert.equal(previewOrigin('https://atlasnote-qa.vercel.app/'),'https://atlasnote-qa.vercel.app'));
const now=Date.now(),meta={id:'dpl_UNITTEST',url:'atlasnote-qa.vercel.app',target:null,readyState:'READY',createdAt:now-1000,projectId:'prj_UNITTEST'};
const options={now,candidateTime:now-5000,projectId:'prj_UNITTEST'};
test('Live metadata of a fresh exact non-production READY candidate is accepted',()=>assert.equal(validatePreviewMetadata(meta,'https://atlasnote-qa.vercel.app',options).id,meta.id));
for(const change of [{target:'production'},{target:undefined},{url:'production-alias.vercel.app'},{readyState:'ERROR'},{createdAt:now-86400001},{createdAt:now-6000},{createdAt:now+600000},{projectId:'prj_OTHER'},{id:'not-an-id'}])test('Reject stale/production metadata '+JSON.stringify(change),()=>assert.throws(()=>validatePreviewMetadata({...meta,...change},'https://atlasnote-qa.vercel.app',options)));
test('No caller can extend preview freshness beyond 24 hours',()=>assert.throws(()=>validatePreviewMetadata(meta,'https://atlasnote-qa.vercel.app',{...options,maxAgeMs:86400001})));
const fakeSecret='unit-only-'+ 's'.repeat(24),origin='https://atlasnote-qa.vercel.app';
test('Bypass request header is scoped to exactly one origin',()=>assert.equal(scopedBypassHeaders(origin+'/assets/main.js',origin,fakeSecret)['x-vercel-protection-bypass'],fakeSecret));
for(const target of ['https://vercel.com/','https://other.vercel.app/','http://atlasnote-qa.vercel.app/','https://atlasnote-qa.vercel.app/?x=1'])test('No bypass credential can be sent to '+target,()=>assert.throws(()=>scopedBypassHeaders(target,origin,fakeSecret)));
for(const status of [401,403])test('Anonymous managed denial '+status+' is observable',()=>assert(isProtectedResponse({status,bodyHash:'denied',appMarker:false},'app')));
for(const p of [{status:200},{status:503},{status:307,redirectToVercel:false},{status:401,bodyHash:'app'},{status:403,appMarker:true}])test('HTTP response is not protection proof '+JSON.stringify(p),()=>assert(!isProtectedResponse(p,'app')));
test('Managed identity redirect counts only when it leads to Vercel and not app bytes',()=>assert(isProtectedResponse({status:307,redirectToVercel:true,bodyHash:'login',appMarker:false},'app')));
test('Header check requires actual private no-store and all four security values',()=>{const h={...SECURITY_HEADERS,'cache-control':'private, no-store, max-age=0'};assert(headersAreSafe(h));assert(!headersAreSafe({...h,'cache-control':'public'}));assert(!headersAreSafe({...h,'x-frame-options':'ALLOWALL'}));});
test('Retained output removes raw and URL-encoded secrets without printing them',()=>{const text='value '+fakeSecret+' '+encodeURIComponent(fakeSecret);const clean=secretFreeText(text,[fakeSecret]);assert(!clean.includes(fakeSecret));assert(clean.includes('[REDACTED]'));});
test('Secret scanning catches Vercel literals but allows variable names/documentation',()=>{assert.deepEqual(secretRules('VERCEL_TOKEN and VERCEL_AUTOMATION_BYPASS_SECRET are environment variables'),[]);assert(secretRules('VERCEL_TOKEN='+ 'A'.repeat(32)).includes('literal-vercel-credential'));assert(secretRules('https://preview.vercel.app/?_vercel_share='+ 'B'.repeat(24)).includes('vercel-secret-url'));});
const expected={sourceCommit:'unit-commit',sourceHash:'unit-hash',runId:'unit-run',startedAt:new Date(now-1000).toISOString()};
const proof={provider:'vercel',status:'PASS',runId:expected.runId,source:{sourceCommit:expected.sourceCommit,sourceHash:expected.sourceHash,sourceDirty:false},startedAt:new Date(now).toISOString(),finishedAt:new Date(now).toISOString(),results:PROVIDER_CASES.map(name=>({name,status:'PASS'}))};
test('Fresh same-run complete provider proof validates',()=>assert(freshProviderEvidence(proof,expected,PROVIDER_CASES)));
for(const change of [{runId:'old-run'},{source:{...proof.source,sourceCommit:'old'}},{source:{...proof.source,sourceHash:'different-bytes'}},{source:{...proof.source,sourceDirty:true}},{startedAt:new Date(now-5000).toISOString()},{status:'BLOCKED'},{results:proof.results.slice(1)},{results:proof.results.map((r,i)=>i?proof.results[0]:r)}])test('Refuse stale/incomplete/different candidate evidence '+Object.keys(change).join(','),()=>assert(!freshProviderEvidence({...proof,...change},expected,PROVIDER_CASES)));
test('Linux native proof remains real ENOSPC, exact five-store/reload equality, safe cleanup',()=>{const s=fs.readFileSync('tests/v23_native_quota.py','utf8');for(const value of ['FILE_ERROR_NO_SPACE','errno.ENOSPC','before==after==reopened','os.path.ismount','256*1024*1024','temporaryDirectoryRemoved','Debugger.setBreakpointByUrl'])assert(s.includes(value),value);assert(!s.includes('setQuotaOverride'));});
test('Provider probe has no hard-coded historical target, follows no auth redirects, records no response body',()=>{const s=fs.readFileSync('tests/v23_access_preview.mjs','utf8');assert(!s.includes('deploy-preview-18'));assert(s.includes("redirect:'manual'"));assert(s.includes('safeHeaders'));assert(s.includes('VERCEL_AUTOMATION_BYPASS_SECRET'));});

test('Root HTML base resolves content, schemas, PDF workers and vendor scripts on deep links',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.match(html,/<base href="\/">/);assert(html.indexOf('<base ')<html.indexOf('<script '));
 const origin='https://atlasnote-qa.vercel.app',deep=new URL('/workspace/5/history/old',origin),base=new URL('/',deep);
 for(const name of ['content.json','app/content/schemas/article.schema.json','pdf-assets/pdf.worker.min.mjs','app/vendor/jszip.js','assets/atlas.svg'])assert.equal(new URL(name,base).href,origin+'/'+name);
 assert(fs.readFileSync('tools/build.mjs','utf8').includes('<base href="/">'));
});
test('Inherited workflow is gated by full V23, not merely the portable core',()=>{
 const ci=fs.readFileSync('.github/workflows/ci.yml','utf8'),qa=fs.readFileSync('.github/workflows/v23-qualification.yml','utf8');
 assert(ci.includes('needs: v23-prerequisite'));assert(ci.includes('uses: ./.github/workflows/v23-qualification.yml'));assert(qa.includes('ATLAS_V23_NATIVE_QUOTA'));assert(qa.includes('npm run test:v23:release'));assert(!qa.includes('--prod'));assert(!qa.includes('continue-on-error: true'));
});
test('Browser bypass is request-scoped with redirect following disabled, not a context header',()=>{
 const code=fs.readFileSync('tests/v23_provider_browser.py','utf8');assert(code.includes('route.fetch(headers=headers,max_redirects=0'));assert(!code.includes('extra_http_headers'));assert(!code.includes('storage_state='));assert(!code.includes('record_har_path'));
});

const inheritedSource={sourceCommit:'unit-sha',sourceHash:'unit-source',sourceTree:'unit-tree',sourceDirty:false};
const inheritedReport={...inheritedSource,runId:'unit-run',provider:'vercel',scope:'full-v23',status:'READY FOR COORDINATOR QA',startedAt:new Date(now-1000).toISOString(),finishedAt:new Date(now).toISOString(),results:V23_GATES.map(id=>({id,status:'PASS',exitCode:0,sourceHash:inheritedSource.sourceHash,sourceDrift:false}))};
test('Only exact fully green fresh V23 unlocks inherited execution',()=>assert(acceptsInheritedPrerequisite(inheritedReport,inheritedSource,now)));
for(const change of [{finishedAt:new Date(now+1).toISOString()},{finishedAt:new Date(now-3600001).toISOString()},{startedAt:new Date(now+1).toISOString()},{scope:'portable-core'},{sourceDirty:true},{sourceHash:'other'},{sourceTree:'other'},{provider:'netlify'},{results:inheritedReport.results.slice(1)},{results:inheritedReport.results.map((r,i)=>i?r:{...r,sourceDrift:true})}])test('Inherited runner refuses invalid prerequisite '+Object.keys(change).join(','),()=>assert(!acceptsInheritedPrerequisite({...inheritedReport,...change},inheritedSource,now)));

test('Exact credential scan detects raw and base64 credentials without returning their values',()=>{
 assert(containsCredential('prefix '+fakeSecret,[fakeSecret]));assert(containsCredential(Buffer.from(fakeSecret).toString('base64'),[fakeSecret]));assert(!containsCredential('VERCEL_TOKEN identifier only',[fakeSecret]));
});
