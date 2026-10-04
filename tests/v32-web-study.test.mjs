import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(path,'utf8');

test('V32 keeps the established IndexedDB v3 five-store contract',()=>{
 const source=read('src/storage/database.ts');
 assert.match(source,/const DB_NAME='knowledge-atlas';export const DB_VERSION=3;/);
 assert(source.includes("const STORES=['imports','overlays','personal','assets','history'];"));
 assert.doesNotMatch(read('src/norsk-daily/NorskDailyView.tsx'),/indexedDB|localStorage|sessionStorage/);
 assert.doesNotMatch(read('src/norsk-daily/daily.ts'),/indexedDB|localStorage|sessionStorage/);
 const settings=read('src/components/SettingsDialog.tsx');assert.match(settings,/navigator\.storage\?\.persisted/);assert.match(settings,/Ask browser to protect local data/);assert.match(settings,/it is not synchronization or a backup/);
});

test('V32 Norsk newspaper and Focus remain local projections with no network client',()=>{
 const source=['src/norsk-daily/NorskDailyView.tsx','src/norsk-daily/daily.ts','src/norsk-daily/projection.ts'].map(read).join('\n');
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon/);
 assert.match(source,/dailySearch/);
 assert.match(source,/norsk-daily-focus-grid/);
 assert.match(source,/Add feed/);
 assert.match(source,/NORSK_TAG\.section/);
 const review=read('src/agent/AgentReviewUI.tsx');
 assert.match(review,/Paste Norsk Daily feed JSON/);assert.match(review,/Convert pasted feed to proposal/);assert.match(review,/Copy Norsk Daily prompt/);
 assert.doesNotMatch(review,/fetch\s*\(|XMLHttpRequest|WebSocket/);
});

test('V32 qualification is manual-only and cannot deploy',()=>{
 const workflow=read('.github/workflows/v32-web-study.yml');
 assert.match(workflow,/\n\s*workflow_dispatch:\s*\n/);
 assert.doesNotMatch(workflow,/\n\s*(?:push|pull_request|schedule):\s*/);
 assert.doesNotMatch(workflow,/wrangler\s+deploy|pages\s+deploy|netlify\s+deploy|vercel\s+deploy/i);
 assert.match(workflow,/npm run check:access/);
 assert.match(workflow,/npm run check:v23:build/);
});

test('V32 package and committed lock identify the same candidate',()=>{
 const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
 assert.equal(pkg.version,'3.2.0-rc.1');
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[''].version,pkg.version);
 assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);
 assert.deepEqual(lock.packages[''].devDependencies,pkg.devDependencies);
});

test('V32 retains the reviewed Cloudflare QA configuration rather than guessing production',()=>{
 const config=JSON.parse(read('wrangler.jsonc'));
 assert.equal(config.name,'atlasnote-v23-qa');
 assert.equal(config.workers_dev,true);
 assert.equal(config.preview_urls,true);
 assert.deepEqual(config.assets,{directory:'./dist',not_found_handling:'single-page-application'});
 const handoff=read('docs/v32/CLOUDFLARE_HANDOFF.md');
 assert.match(handoff,/do not run plain `wrangler deploy`/);
 assert.match(handoff,/authenticated Cloudflare access/);
});
