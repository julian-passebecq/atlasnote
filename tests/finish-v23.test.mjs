/** Unit/contract coverage only. These tests are NOT real IndexedDB qualification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {openDatabase,store} from '../dist-offline/app/storage/database.js';
import {blankWorkspace} from '../dist-offline/app/core/workspace.js';
import {captureEmergencyRecovery} from '../dist-offline/app/durability/emergency.js';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('V23 blocked database open closes a late successful orphan before retry',async()=>{
 const original=globalThis.indexedDB;let closes=0,calls=0,active;
 globalThis.indexedDB={open(){const req={};calls++;queueMicrotask(()=>{
  if(calls===1){req.onblocked();setTimeout(()=>{req.result={close(){closes++;}};req.onsuccess();},5);}
  else {active={close(){closes++;}};req.result=active;req.onsuccess();}
 });return req;}};
 try{
  await assert.rejects(openDatabase(),/blocked by another Atlas tab/);
  await delay(15);assert.equal(closes,1,'Late success must not retain an unowned connection');
  assert.equal(await openDatabase(),active);assert.equal(calls,2,'Retry must create a fresh request');
  active.onversionchange();assert.equal(closes,2);
 }finally{globalThis.indexedDB=original;}
});

test('V23 emergency raw export preserves unsaved memory even when IndexedDB cannot open',async()=>{
 const original={idb:globalThis.indexedDB,state:store.state,error:store.error,saving:store.saving};
 const ws=blankWorkspace();ws.overlays.pages['qa.unsaved']={page:{id:'qa.unsaved',title:'UNSAVED evidence',blocks:[],related:[]}};
 store.setLoaded(ws);store.error='Injected disk failure';store.saving=0;
 globalThis.indexedDB={open(){throw new DOMException('Injected disk unavailable','UnknownError');}};
 try{
  const report=await captureEmergencyRecovery(100);
  assert.equal(report.format,'atlasnote-emergency-recovery');assert.equal(report.schemaVersion,1);
  assert.equal(report.persistence.status,'unsaved');assert.equal(report.persisted,null);
  assert.match(report.persistedReadError,/Injected disk unavailable/);
  assert.equal(report.inMemory.overlays.pages['qa.unsaved'].page.title,'UNSAVED evidence');
  report.inMemory.overlays.pages['qa.unsaved'].page.title='Detached edit';
  assert.equal(store.state.overlays.pages['qa.unsaved'].page.title,'UNSAVED evidence');
  assert.match(report.warning,/not a verified workspace backup/);assert.equal(store.error,'Injected disk failure');
 }finally{globalThis.indexedDB=original.idb;store.setLoaded(original.state);store.error=original.error;store.saving=original.saving;}
});

test('V23 emergency raw export cannot hang behind an indefinitely pending read',async()=>{
 const original={idb:globalThis.indexedDB,state:store.state,error:store.error,saving:store.saving};let db;
 globalThis.indexedDB={open(){
  const req={};
  queueMicrotask(()=>{
   db={close(){},transaction(){
    return {objectStore(){return {getAll(){return {};}};}};
   }};
   req.result=db;req.onsuccess();
  });
  return req;
 }};
 store.setLoaded(blankWorkspace());store.saving=1;store.error='';
 try{
  const report=await captureEmergencyRecovery(5);
  assert.equal(report.persistence.status,'pending');assert.equal(report.persistence.pendingWrites,1);
  assert.equal(report.persisted,null);assert.match(report.persistedReadError,/timed out/);
  assert.deepEqual(report.inMemory,store.state);assert.equal(store.saving,1);
 }finally{db?.onversionchange?.();globalThis.indexedDB=original.idb;store.setLoaded(original.state);store.error=original.error;store.saving=original.saving;}
});

test('V23 capacity boundaries, five-store atomic compactor and closed-world gates are retained',async()=>{
 const {HISTORY_LIMITS}=await import('../dist-offline/app/history/validation.mjs');
 assert.deepEqual([HISTORY_LIMITS.perResource,HISTORY_LIMITS.totalRevisions,HISTORY_LIMITS.reviewRecords,HISTORY_LIMITS.bytes],[2000,25000,500,64*1024*1024]);
 const {releaseStatus,V23_GATES,COMPACTION_FAULTS,PROVIDER_CASES}=await import('../tools/v23-release-contract.mjs');
 assert.equal(V23_GATES.length,13);assert.equal(COMPACTION_FAULTS.length,13);assert.equal(PROVIDER_CASES.length,20);
 const rows=V23_GATES.map(id=>({id,status:'PASS',exitCode:0}));assert.equal(releaseStatus(rows),'READY FOR COORDINATOR QA');
 rows[0].exitCode=2;assert.equal(releaseStatus(rows),'BLOCKED');
 const source=await fs.readFile('src/storage/database.ts','utf8');
 assert.match(source,/const STORES=\['imports','overlays','personal','assets','history'\]/);
 assert.match(source,/export const DB_VERSION=3/);
});

test('V23 emergency read success keeps saved and unsaved copies explicitly separate',async()=>{
 const original={idb:globalThis.indexedDB,state:store.state,error:store.error,saving:store.saving};let db;
 const saved=blankWorkspace(),memory=structuredClone(saved);memory.personal.session.fontSize=20;
 const records={imports:[],overlays:[saved.overlays],personal:[saved.personal],assets:[],history:[]};
 globalThis.indexedDB={open(){const req={};queueMicrotask(()=>{db={close(){},transaction(){return {objectStore(name){return {getAll(){const r={};queueMicrotask(()=>{r.result=structuredClone(records[name]);r.onsuccess();});return r;}};}};}};req.result=db;req.onsuccess();});return req;}};
 store.setLoaded(memory);store.error='Unsaved test change';store.saving=0;
 try{
  const report=await captureEmergencyRecovery(100);
  assert.equal(report.persistedReadError,null);
  assert.deepEqual(report.persisted.personal,[saved.personal]);
  assert.equal(report.inMemory.personal.session.fontSize,20);
  assert.notDeepEqual(report.inMemory.personal,saved.personal);
  assert.equal(report.persistence.status,'unsaved','A successful read does not make a failed write saved');
  await assert.rejects(captureEmergencyRecovery(0),/Invalid emergency read timeout/);
 }finally{db?.onversionchange?.();globalThis.indexedDB=original.idb;store.setLoaded(original.state);store.error=original.error;store.saving=original.saving;}
});

test('V23 browser qualification cannot silently replace real historical PDF rendering or swallow failed recovery',async()=>{
 const helper=await fs.readFile('tests/v23_finish_support.py','utf8');
 assert.match(helper,/state='visible'/);assert.match(helper,/data-worker-status="compatible"/);
 assert.match(helper,/getImageData/);assert.match(helper,/byte revision/);
 assert.match(helper,/pixelHash.*!=.*pixelHash/);
 const workflow=await fs.readFile('.github/workflows/v23-qualification.yml','utf8');
 assert.doesNotMatch(workflow,/continue-on-error:\s*true/);
 assert.match(workflow,/final\/atlasnote-2\.3-pro-finish/);
 const runtime=await fs.readFile('tests/v23_runtime.py','utf8');
 assert.match(runtime,/confirm\.uncheck\(\);assert commit\.is_disabled\(\)/);
});
