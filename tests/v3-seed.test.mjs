import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {readFiles} from '../tools/fs.mjs';import {readWorkspace,loadSchemas} from '../src/core/packs.mjs';
import {walkBlocks} from '../src/core/validation.mjs';
import {validateQcm} from '../src/content-hub/validation.mjs';import {validateReadingTarget} from '../src/storage/reading-validation.mjs';
import {blankWorkspace,compose} from '../dist-offline/app/core/workspace.js';
import {migratePersonal,activeSession} from '../dist-offline/app/core/workspace-slots.js';
import {openReadingTarget} from '../dist-offline/app/core/reading-navigation.js';
import * as content from '../dist-offline/app/content-hub/content.js';import * as taxonomy from '../dist-offline/app/content-hub/taxonomy.js';

// V3 foundation seed pack: 64 stable-ID Notebook pages plus one linked data-engineering
// slice and one Norsk slice, each ending in a native QCM. The 0.2.0 enrichment links every
// page, adds glossary terms and four more native QCM sets. Draft content; owner review required.
const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
const files=await readFiles('content'),review=JSON.parse(await fs.readFile('content/publication-review.json','utf8')).packs;
const source=await readWorkspace(files,schemas),built={packs:source.packs,groups:source.workspace.groups,assets:source.assets,releaseId:'v3-seed-unit'};
const pack=source.packs.find(p=>p.manifest.id==='atlas.v3-seed');
const P=id=>'page.v3seed.'+id,QCM_DE='page.v3seed.qcm.grain-joins-windows',QCM_NO='page.v3seed.qcm.norsk-word-order';
const QCM_SPARK=P('qcm.pyspark-execution-performance'),QCM_PY=P('qcm.python-data-engineering'),QCM_CLOUD=P('qcm.cloud-data-platforms'),QCM_NOG=P('qcm.norsk-grammar');
const NEW_QCMS=[[QCM_SPARK,8,'it','node.v3seed.de.spark'],[QCM_PY,8,'it','node.v3seed.de.python'],[QCM_CLOUD,8,'cloud','node.v3seed.cloud.practice'],[QCM_NOG,8,'norsk','node.v3seed.norsk.grammar']];
const DE_PATH=['sql-grain-before-joins','merge-validation-and-cardinality','inner-left-and-anti-joins','window-functions','rows-versus-range-window-frames'].map(P);
const NO_PATH=['v2-word-order-in-main-clauses','subordinate-clauses-and-ikke'].map(P);
const page=id=>pack.pages.find(p=>p.id===id);
function setup(){const ws=blankWorkspace();ws.personal=migratePersonal(ws.personal);return {ws,c:compose(built,ws)};}

test('V3 seed pack ships 64 Notebook pages with stable seed IDs plus exactly six native QCM sets',()=>{
 assert.equal(pack.manifest.visibility,'public');assert.equal(pack.manifest.payloadSchema,'atlas.bundle@2');
 const seed=pack.pages.filter(p=>p.id.startsWith('page.v3seed.')&&!p.kind);
 assert.equal(seed.length,64);assert.equal(pack.pages.length,70);
 assert.deepEqual(pack.pages.filter(p=>p.kind==='qcm').map(p=>p.id).sort(),[QCM_DE,QCM_NO,QCM_SPARK,QCM_PY,QCM_CLOUD,QCM_NOG].sort());
 assert(pack.pages.every(p=>!p.kind||p.kind==='qcm'),'no other specialised kinds were invented');
 for(const p of seed){assert(p.tags.includes('seed:v3'));assert(!p.tags.some(t=>t.startsWith('project:')),'stale suggestion project tags are reconciled');assert(p.provenance);}
 // Seed "question" blocks stay Notebook blocks; they are not native QCM resources.
 let questionBlocks=0;for(const p of seed)walkBlocks(p.blocks,b=>{if(b.type==='question')questionBlocks++;});
 assert.equal(questionBlocks,11);assert.equal(pack.pages.filter(p=>p.kind==='qcm').length,6);
});

test('V3 seed publication entry is explicit, exact and flags owner review',async()=>{
 assert.match(review['atlas.v3-seed'].review,/OWNER REVIEW REQUIRED before publication/);
 assert.equal(review['atlas.v3-seed'].sha256,pack.hash);
 await readWorkspace(files,schemas,{publicOnly:true,reviewed:review});
 const stale=structuredClone(review);stale['atlas.v3-seed'].sha256='0'.repeat(64);
 await assert.rejects(readWorkspace(files,schemas,{publicOnly:true,reviewed:stale}),/Review hash is stale: atlas.v3-seed/);
});

test('every V3 seed resource is placed once and classified into the five canonical subjects',()=>{
 const {ws,c}=setup();const counts={};
 for(const p of pack.pages){const t=taxonomy.resourceTaxonomy(c,ws.overlays,p.id);assert(t,'classified '+p.id);counts[t.subject]=(counts[t.subject]??0)+1;assert(p.tags.includes('subject:'+t.subject),'tag agrees with category '+p.id);}
 assert.deepEqual(counts,{it:32,cloud:15,norsk:13,job:8,kpi:2});
 assert.equal(pack.pages.filter(p=>content.libraryModeForPage(c,p.id)==='notes').length,64);
 const qcmTree=taxonomy.projectLibrary(c,ws.overlays,'qcm','it'),ids=[];const walk=ns=>{for(const n of ns){if(n.pageId)ids.push(n.pageId);if(n.children)walk(n.children);}};for(const p of qcmTree)walk(p.nodes);
 assert(ids.includes(QCM_DE));assert(!ids.includes(QCM_NO));
 assert(ids.includes(QCM_SPARK)&&ids.includes(QCM_PY));assert(!ids.includes(QCM_CLOUD)&&!ids.includes(QCM_NOG));
 for(const [id,,subject,folderId] of NEW_QCMS)assert.deepEqual(taxonomy.resourceTaxonomy(c,ws.overlays,id),{subject,folderId},id+' placed in its folder');
 const folders=taxonomy.sharedFolders(c,ws.overlays),de=taxonomy.resourceTaxonomy(c,ws.overlays,QCM_DE);assert.deepEqual(de,{subject:'it',folderId:'node.v3seed.de.path'});
 assert.deepEqual(taxonomy.resolveTaxonomy(de,folders).path,['Data engineering foundations','Guided path: grain, joins and window frames']);
 assert.equal(taxonomy.resourceTaxonomy(c,ws.overlays,QCM_NO).folderId,'node.v3seed.norsk.path');
});

test('the data-engineering slice is linked grain -> cardinality -> joins -> windows -> frames -> QCM',()=>{
 for(const [i,id] of DE_PATH.entries()){const p=page(id);
  assert(p.tags.includes('path:grain-joins-windows'));assert(p.related.includes(QCM_DE),id+' relates to practice');
  if(i>0)assert(p.related.includes(DE_PATH[i-1]),id+' links back');
  if(i<DE_PATH.length-1){assert(p.related.includes(DE_PATH[i+1]),id+' relates forward');const next=p.blocks.filter(b=>b.type==='link');assert.equal(next.length,1);assert.equal(next[0].pageId,DE_PATH[i+1]);}
  assert(p.terms.length>0&&p.sources.length>0,id+' has glossary terms and reference links');}
 const last=page(DE_PATH.at(-1)).blocks.find(b=>b.type==='resource-link');validateReadingTarget(last.target);
 assert.deepEqual(last.target,{kind:'qcm',setId:QCM_DE,pageId:QCM_DE});
 assert.deepEqual(page(QCM_DE).related,DE_PATH);
});

test('slice QCMs are native, explained and link back to the explaining pages',()=>{
 for(const [id,count,path] of [[QCM_DE,8,DE_PATH],[QCM_NO,5,NO_PATH]]){const p=page(id);validateQcm(p.qcm);
  assert.equal(p.qcm.id,p.id);assert.equal(p.qcm.title,p.title);assert.equal(p.blocks.length,0);assert.equal(p.qcm.questions.length,count);
  assert(p.qcm.questions.some(q=>q.correctOptionIds.length>1),'at least one multiple-answer question');
  for(const q of p.qcm.questions){assert(q.explanation?.length>20,q.id+' explained');assert.equal(q.links.length,1);validateReadingTarget(q.links[0].target);assert(path.includes(q.links[0].target.pageId),q.id+' links into its slice');}}
});

test('slice QCM targets open through the canonical reading-target route',()=>{
 const {ws,c}=setup();const target=page(DE_PATH.at(-1)).blocks.find(b=>b.type==='resource-link').target;
 openReadingTarget(ws.personal,c,ws.overlays,target,'here');
 const pane=activeSession(ws.personal).panes[0],view=pane.views.find(v=>v.id===pane.active);assert.equal(view.history[view.cursor].pageId,QCM_DE);
});

test('Norsk slice links V2 -> subordinate clauses -> QCM',()=>{
 const [v2,sub]=NO_PATH.map(page);
 assert.equal(v2.blocks.find(b=>b.type==='link').pageId,sub.id);assert(v2.related.includes(sub.id)&&sub.related.includes(v2.id));
 assert.deepEqual(sub.blocks.find(b=>b.type==='resource-link').target,{kind:'qcm',setId:QCM_NO,pageId:QCM_NO});
 assert(!v2.blocks.some(b=>b.type==='list'&&b.items.some(i=>i.startsWith('Et fronted'))),'English typo corrected');
});

test('glossary terms and page term references agree in both directions',()=>{
 const terms=new Map(pack.glossary.map(t=>[t.id,t]));assert.equal(terms.size,41);
 for(const t of pack.glossary)for(const id of t.pageIds)assert(page(id).terms.includes(t.id),t.id+' <- '+id);
 for(const p of pack.pages)for(const t of p.terms)assert(terms.get(t),'term exists '+t);
 for(const p of pack.pages.filter(p=>!p.kind))for(const t of p.terms)assert(terms.get(t).pageIds.includes(p.id),p.id+' -> '+t);
 for(const id of ['term.v3seed.grain','term.v3seed.join-cardinality','term.v3seed.window-frame'])assert(terms.has(id));
});

test('proposed Spark cache correction is applied: actions consume the cache before unpersist in finally',()=>{
 const code=page(P('cache-and-persistence')).blocks.find(b=>b.id==='block.v3seed.cache-and-persistence.code');
 assert(!code.code.includes('expensive_transform'));assert.match(code.code,/try:\n[\s\S]*finally:\n\s+base\.unpersist\(\)/);
 assert(code.code.lastIndexOf('.show()')<code.code.indexOf('base.unpersist()'));assert.match(code.explanation,/Not executed/);
 const json=page(P('json-csv-and-file-boundaries')).blocks.find(b=>b.type==='code');assert(!json.code.includes('assert isinstance'));assert.match(json.code,/raise ValueError/);
});

test('enrichment: every Notebook page has 2-5 resolvable related links and the project set is unchanged',()=>{
 const ids=new Set(source.packs.flatMap(p=>p.pages).map(p=>p.id));
 for(const p of pack.pages.filter(p=>!p.kind)){assert(p.related.length>=2&&p.related.length<=5,p.id+' related count '+p.related.length);assert.equal(new Set(p.related).size,p.related.length);assert(!p.related.includes(p.id));for(const r of p.related)assert(ids.has(r),p.id+' -> '+r);}
 assert(pack.pages.filter(p=>!p.kind&&p.terms.length).length>=55,'most Notebook pages reference glossary terms');
 const external=pack.pages.flatMap(p=>p.related).filter(r=>!r.startsWith('page.v3seed.'));assert(external.length>0&&external.every(r=>r.startsWith('page.samples.')),'cross-pack links only reach study.samples');
 assert.deepEqual(pack.manifest.requires,[{id:'study.samples',version:'1.1.0'}]);
 assert.deepEqual(pack.projects.map(p=>p.id).sort(),['project.v3seed.cloud','project.v3seed.data-engineering','project.v3seed.interview','project.v3seed.norsk','project.v3seed.study-workflow']);
 for(const t of ['term.v3seed.shuffle','term.v3seed.broadcast-join','term.v3seed.medallion-architecture','term.v3seed.unity-catalog','term.v3seed.onelake','term.v3seed.definite-form','term.v3seed.modal-verb'])assert(pack.glossary.some(x=>x.id===t),t);
 for(const t of pack.glossary){assert(t.definition.length>40,t.id+' defined');assert(t.pageIds.length>0,t.id+' used');}
 for(const t of ['definite-form','grammatical-gender','adjective-inflection','preterite','present-perfect','modal-verb','connector'])assert(pack.glossary.find(x=>x.id==='term.v3seed.'+t).translation,t+' has a Norwegian translation');
});

test('enrichment: reference links point only to official documentation hosts over https',()=>{
 const hosts=new Set(['docs.python.org','www.postgresql.org','spark.apache.org','pandas.pydata.org','learn.microsoft.com','docs.databricks.com','delta.io','mlflow.org','www.sprakradet.no','ordbokene.no']);
 let n=0;for(const p of pack.pages)for(const s of p.sources){n++;const u=new URL(s.url);assert.equal(u.protocol,'https:');assert(hosts.has(u.hostname),p.id+' '+s.url);assert.match(s.note,/no text copied/i);}
 assert(n>=50,'reference links '+n);
});

test('enrichment: four new native QCMs are explained, linked from their pages and link back to them',()=>{
 for(const [id,count] of NEW_QCMS){const p=page(id);validateQcm(p.qcm);
  assert.equal(p.qcm.id,p.id);assert.equal(p.qcm.title,p.title);assert.equal(p.blocks.length,0);assert.equal(p.qcm.questions.length,count);
  assert(p.qcm.questions.some(q=>q.correctOptionIds.length>1),id+' has a multiple-answer question');
  for(const q of p.qcm.questions){assert(q.explanation?.length>20,q.id+' explained');assert.equal(q.links.length,1);validateReadingTarget(q.links[0].target);const target=page(q.links[0].target.pageId);
   assert(target&&!target.kind,q.id+' links to an explaining Notebook page');assert(target.related.includes(id),target.id+' relates to '+id);assert(p.related.includes(target.id),id+' relates to '+target.id);}
  for(const t of p.terms)assert(pack.glossary.some(x=>x.id===t),t);}
 const ids=pack.pages.filter(p=>p.kind==='qcm').flatMap(p=>p.qcm.questions.map(q=>q.id));assert.equal(new Set(ids).size,ids.length);assert.equal(ids.length,45);
});

test('enrichment clarifications keep existing block IDs and add no Notebook question blocks',()=>{
 const adj=page(P('adjective-agreement'));assert.deepEqual(adj.blocks.map(b=>b.id).slice(0,2),['block.v3seed.adjective-agreement.overview','block.v3seed.adjective-agreement.points']);
 assert(adj.blocks.some(b=>b.type==='table'&&b.rows.some(r=>r.includes('et stort møte'))));assert(adj.blocks.some(b=>b.id==='block.v3seed.adjective-agreement.question'));
 assert.match(page(P('missing-data-and-nullable-dtypes')).blocks.find(b=>b.type==='code').explanation,/fractional part[\s\S]*Not executed/);
});
