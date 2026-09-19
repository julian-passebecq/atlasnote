/** Optional synthetic fixture exporter: no personal profile and no IDB writes.
 * The externalized fixture is constructed by a PURE PLAN, not safe-compaction proof.
 */
import fs from 'node:fs/promises';import path from 'node:path';
import {demoWorkspace,built,schemas,provenance,resolveFor,compose} from '../tests/v23/fixtures.mjs';
import {makeHistoryArchive,planCompaction} from '../dist-offline/app/durability/archive.mjs';
import {createVerifiedBackup,createRecoveryBundle} from '../dist-offline/app/durability/recovery.js';
import {captureResources} from '../dist-offline/app/history/adapters.js';
import {sha256} from '../dist-offline/app/core/validation.mjs';
const dir=path.resolve(process.env.ATLAS_FIXTURE_OUT??'docs/evidence/v23/synthetic-fixtures');
await fs.mkdir(dir,{recursive:true});const ws=await demoWorkspace(),resolver=resolveFor(ws),archive=await makeHistoryArchive(ws,provenance,resolver),plan=await planCompaction(ws,archive,built.packs,captureResources(compose(built,ws),ws),resolver);
const full=await createVerifiedBackup(ws,built,resolver,provenance,schemas),externalized=await createVerifiedBackup(plan.workspace,built,resolveFor(plan.workspace),provenance,schemas),recovery=await createRecoveryBundle(plan.workspace,built,resolveFor(plan.workspace),provenance,schemas,()=>archive.bytes);
const files={'01-synthetic-live.atlas-backup.zip':full.bytes,'02-synthetic-history.atlas-history.zip':archive.bytes,'03-CONSTRUCTED-externalized.atlas-backup.zip':externalized.bytes,'04-CONSTRUCTED-complete.atlas-recovery.zip':recovery.bytes},inventory=[];
for(const [name,bytes]of Object.entries(files)){await fs.writeFile(path.join(dir,name),bytes);inventory.push({name,bytes:bytes.length,sha256:await sha256(bytes)});}
await fs.writeFile(path.join(dir,'MANIFEST.json'),JSON.stringify({status:'SYNTHETIC_FIXTURES_ONLY',source:provenance,archive:archive.descriptor,preview:plan.preview,files:inventory},null,2));
await fs.writeFile(path.join(dir,'README.md'),`# Optional synthetic QA fixtures\n\nNever restore these over a real workspace. Use an empty disposable browser profile.\nAll content and assets are original synthetic examples. Nothing came from a user profile.\n\n01 is the live demo backup. 02 is its byte-verified history archive. 03 is a VALID\nbackup with an externalized archive index constructed using a pure in-memory plan,\nNOT a successful compaction transaction. Restore 03 to exercise exact missing-archive\nbehavior; attach 02 to exercise old/current Compare, old PDF bytes and restore-as-new.\n04 is a complete recovery bundle containing the same current state and required archive.\nRestore/reattach 04 to test recovery paths. Attachments are session-only after reload.\n\nThese files enable read-only/archive-recovery QA while destructive compaction is absent.\nThey do not certify IndexedDB atomicity, and must not be used to bypass the disabled\ncompaction method on real data. Source identity, hashes and byte counts are in MANIFEST.json.\n`);console.log(JSON.stringify({status:'GENERATED_AND_VERIFIED_SYNTHETIC_ONLY',files:inventory},null,2));
