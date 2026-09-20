/** A VALID 64 MiB model/archive experiment. Never actual IndexedDB qualification. */
import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {buildCapacityFixture} from './capacity-fixtures.mjs';
import {demoWorkspace,built,compose,provenance,resolveFor} from './fixtures.mjs';
import {makeHistoryArchive,planCompaction} from '../../dist-offline/app/durability/archive.mjs';
import {validateHistory} from '../../dist-offline/app/history/validation.mjs';
import {captureResources} from '../../dist-offline/app/history/adapters.js';
import {assertProjection,advanceHistory} from '../../dist-offline/app/history/engine.js';
const out=process.env.ATLAS_EVIDENCE??'docs/evidence/v23/byte-archive-diagnostic';await fs.mkdir(out,{recursive:true});
const started=performance.now(),results=[];
try{
 const f=await buildCapacityFixture(await demoWorkspace(),'64-MiB-structured-history'),ws=f.workspace;
 await validateHistory(ws.history);await assertProjection(compose(built,ws),ws);
 assert.equal(f.counts.bytes,64*1024*1024);
 console.log('Valid exact 64 MiB fixture validated');
 const archive=await makeHistoryArchive(ws,provenance,resolveFor(ws),{retain:1});
 console.log('Archive bytes created and independently re-parsed/verified');
 const resources=captureResources(compose(built,ws),ws);
 const plan=await planCompaction(ws,archive,built.packs,resources,resolveFor(ws));
 await validateHistory(plan.workspace.history);await assertProjection(compose(built,plan.workspace),plan.workspace);
 const target=structuredClone(resources.find(r=>r.resourceKey===f.resourceKey));target.snapshot.page.title+=' after model capacity recovery';
 const next=await advanceHistory(plan.workspace.history,[target],{source:'manual'});await validateHistory(next);
 assert.equal(next.reviews.find(r=>r.id===f.pendingId).status,'staged');
 assert.deepEqual(plan.workspace.history.heads,ws.history.heads);
 const archiveMs=Math.round(performance.now()-started);
 results.push({name:'Valid 64 MiB structured history -> verified ZIP -> pure compaction plan -> next model edit',status:'PASS',beforeBytes:f.counts.bytes,archiveBytes:archive.bytes.length,afterBytes:new TextEncoder().encode(JSON.stringify(plan.workspace.history)).length,archivedRevisions:archive.revisions.length,archivedReviews:archive.reviews.length,pendingRetained:true,durationMs:archiveMs});
}catch(e){results.push({name:'Valid 64 MiB archive diagnostic',status:'FAIL',error:e.stack});}
results.push({name:'Normal-origin IndexedDB capacity recovery',status:'BLOCKED',reason:'No IndexedDB transaction, native saved-file re-selection or browser render is executed by this diagnostic. Run test:v23:capacity on the exact integrated candidate.'});
const report={scope:'Pure synthetic fixture + real ZIP serialization, verification and planning only. Not browser release evidence.',results};
await fs.writeFile(out+'/results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=results.some(r=>r.status==='FAIL')?1:2;
