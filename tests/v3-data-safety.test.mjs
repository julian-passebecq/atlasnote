/** V3 data-safety gates DATA-02 and DATA-03 (unit level; browser/IndexedDB evidence is separate). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {setup,built,authoredFixtures,assetResolver} from './v22/fixtures.mjs';
import {makeBackup,readBackup,unzipBounded} from '../src/storage/archives.mjs';
import {loadSchemas} from '../src/core/packs.mjs';
import {compose} from '../dist-offline/app/core/workspace.js';
import {captureResources} from '../dist-offline/app/history/adapters.js';
import {WorkspaceStore} from '../dist-offline/app/storage/database.js';
import {profileFromPreset} from '../dist-offline/app/experience/profile.mjs';
import {buildResourceFacts,experienceCounts} from '../dist-offline/app/experience/facts.js';
import {setHistoryComplete} from '../dist-offline/app/durability/registry.js';
const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));

test('DATA-02: resources hidden by every workspace Experience are still in the full backup and restore identically',async()=>{
 const {backend}=await setup(),ws=backend.state;
 // Hide almost everything: Norsk only, two types, in every slot that exists.
 const narrow={...profileFromPreset('norsk-daily'),types:{notes:true,pdfs:false,cheatsheets:false,articles:false,qcm:true}};
 ws.personal.session.experience=narrow;
 const facts=buildResourceFacts(compose(built,ws),ws.overlays),counts=experienceCounts(narrow,facts);
 assert(counts.visible<counts.total,'the Experience really hides resources');
 const resources=captureResources(compose(built,ws),ws);
 const backup=await makeBackup(ws,built,assetResolver),restored=(await readBackup((await unzipBounded(backup.bytes)).files,schemas)).workspace;
 assert.deepEqual(captureResources(compose(built,restored),restored).map(r=>r.resourceKey).sort(),resources.map(r=>r.resourceKey).sort(),'every resource survives, visible or not');
 assert.deepEqual(restored.history.heads,ws.history.heads);assert.equal(restored.history.revisions.length,ws.history.revisions.length);
 // Nothing is lost: every stored asset is present (the backup may add history-referenced pack assets).
 const restoredKeys=new Set(restored.assets.map(a=>a.key));assert(ws.assets.every(a=>restoredKeys.has(a.key)));
 for(const r of ws.history.revisions)if(r.snapshot.document?.assetKey)assert(restoredKeys.has(r.snapshot.document.assetKey),'historical PDF bytes retained: '+r.snapshot.document.assetKey);
 assert.deepEqual(restored.personal.session.experience,narrow,'the profile itself is backed up');
});

test('DATA-03: after a failed read, no ordinary write can replace the stored record with the blank state',async()=>{
 const store=new WorkspaceStore();store.setLoaded(structuredClone(authoredFixtures()));
 store.beginStagedBoot();store.markShellFailed(Error('Unknown saved-state version'));
 assert.equal(store.writesBlocked,true);
 await assert.rejects(store.personal(p=>{p.session.fontSize=19;}),/could not be read, so nothing will be written over it/);
 await assert.rejects(store.retry(),/could not be read/);
 await assert.rejects(store.overlays(()=>{}),/did not finish loading/);
 await assert.rejects(store.backupSnapshot(),/did not finish loading/);
 // A checkpoint is coalesced; its later flush must also be refused, never written.
 store.error='';store.checkpoint(p=>{p.session.fontSize=20;});await store.flush().catch(()=>{});
 assert.match(store.error,/could not be read/,'the refused flush is surfaced as a storage warning');
 setHistoryComplete(true);
});
