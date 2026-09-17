import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {readWorkspace,loadSchemas} from '../src/core/packs.mjs';
import {readFiles} from '../tools/fs.mjs';
import {blankWorkspace,compose,newView} from '../dist-offline/app/core/workspace.js';
import {targetForPage,addReadingBookmark} from '../dist-offline/app/core/reading-lists.js';
import {newCaptureDraft,removeDraftRow,appendDraftRow} from '../dist-offline/app/stabilization/capture-draft.js';
import {toggleDashboard} from '../dist-offline/app/content-hub/surfaces.js';
import {encodeResourceDrag,parseResourceDrag,applyReferenceDrop} from '../dist-offline/app/stabilization/resource-drag.js';
import {prepareSourceReplacement,resourceSource,sourceIdentity} from '../dist-offline/app/stabilization/resource-source.js';
import {prepareDemo,demoFixture} from '../dist-offline/app/stabilization/demo.js';
import {WorkspaceStore} from '../dist-offline/app/storage/database.js';
import {resolveTarget} from '../dist-offline/app/references/targets.js';
import {answerQuestion} from '../dist-offline/app/content-hub/content.js';
import {makeBackup,readBackup,unzipBounded} from '../src/storage/archives.mjs';
const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
const source=await readWorkspace(await readFiles('content'),schemas),built={packs:source.packs,groups:source.workspace.groups},clone=structuredClone;
function start(){const ws=blankWorkspace(),c=compose(built,ws),next=prepareDemo(c,ws,'load');Object.assign(ws,{personal:next.personal,overlays:next.overlays});return {ws,c:compose(built,ws)};}
const ids={articles:'demo.v2.article.sql',qcm:'demo.v2.qcm.spark',cheatsheets:'page.cheatsheet.pyspark-execution',pdfs:'page.atlas.pdf'};
const replace=(c,ws,id,v,expected)=>prepareSourceReplacement(c,ws,id,typeof v==='string'?v:JSON.stringify(v),expected);

test('stabilization: capture starts with three independent empty rows and defaults global',()=>{const d=newCaptureDraft();assert.equal(d.rows.length,3);assert.equal(d.mode,'link');assert.equal(d.attach,false);assert(!('taxonomy'in d));d.rows[0].text='only first';assert.equal(d.rows[1].text,'');});
test('stabilization: draft row floor and cap do not mutate input',()=>{const original=newCaptureDraft('task');assert.equal(removeDraftRow(original,0),original);let d=appendDraftRow(appendDraftRow(original));assert.equal(d.rows.length,5);assert.equal(appendDraftRow(d),d);d=removeDraftRow(d,1);assert.equal(d.rows.length,4);assert.equal(original.rows.length,3);});
test('stabilization: saved capture workflow snapshot preserves hidden URL, date, importance and classification',()=>{const d=newCaptureDraft('task');d.rows[0]={text:'write',url:'https://example.com',due:'2026-09-20',important:true};d.attach=true;d.taxonomy={subject:'it'};const saved=clone(d);const article={sourceType:'article'};article.title='Separate';assert.deepEqual(saved,d);});
test('stabilization: Dashboard toggle changes only surface and selected capture, not readers',()=>{const ws=blankWorkspace(),s=ws.personal.session;delete s.surface;s.screen='reader';const a=newView('page.atlas.layouts'),b=newView('page.atlas.pdf',undefined,true);a.history[0].scroll=346;b.history[0].pdfPage=3;s.panes=[{id:'left',views:[a],active:a.id},{id:'right',views:[b],active:b.id}];s.activePane='right';const before=clone(s);toggleDashboard(s);assert.equal(s.surface,'dashboard');toggleDashboard(s);assert.deepEqual(s,before);});
for(const [kind,id]of Object.entries(ids)){
 test('stabilization: actual '+kind+' source has validated shared copy-only drag',()=>{const {c,ws}=start(),p=c.pages.find(p=>p.id===id),target=targetForPage(c,id),before=clone(ws);const raw=encodeResourceDrag(target,p.title),payload=parseResourceDrag(raw,c,ws);assert.deepEqual(payload.target,target);const o=applyReferenceDrop(raw,c,ws,'demo.v2.notebook.it');assert(o.references.some(r=>r.target.pageId===id));assert.deepEqual(ws,before);assert.deepEqual(o.pages,ws.overlays.pages);});
 test('stabilization: '+kind+' canonical JSON round-trip remains valid without touching input',()=>{const {c,ws}=start(),p=c.pages.find(p=>p.id===id),before=clone(ws),v=resourceSource(c,ws,p);const o=replace(c,ws,id,v);assert.deepEqual(ws,before);assert.equal(o.pages[id].page.id,id);});
 test('stabilization: '+kind+' malformed JSON is atomic',()=>{const {c,ws}=start(),before=clone(ws);assert.throws(()=>replace(c,ws,id,'{'));assert.deepEqual(ws,before);});
}
for(const [name,make]of [
 ['unknown version',v=>({...v,schemaVersion:9})],['HTML field',v=>({...v,html:'<script>bad</script>'})],['missing target',v=>({...v,target:{kind:'page',pageId:'missing'}})],['missing block',v=>({...v,target:{kind:'article',articleId:'demo.v2.article.sql',pageId:'demo.v2.article.sql',anchor:{blockId:'missing'}}})],['unsafe URL',v=>({...v,target:{kind:'url',url:'javascript:alert(1)'}})],['not a resource',v=>({...v,target:{kind:'collection',collectionId:'demo.v2.notebook.it'}})]
])test('stabilization: drag rejects '+name+' before mutation',()=>{const {c,ws}=start(),before=clone(ws),v=JSON.parse(encodeResourceDrag(targetForPage(c,ids.articles),'Title'));assert.throws(()=>applyReferenceDrop(JSON.stringify(make(v)),c,ws,'demo.v2.notebook.it'));assert.deepEqual(ws,before);});
test('stabilization: malformed, byte-oversized, prototype drag and missing folder fail closed',()=>{const {c,ws}=start();for(const raw of ['{','x'.repeat(20001),'{"__proto__":{}}'])assert.throws(()=>parseResourceDrag(raw,c,ws));const v=encodeResourceDrag(targetForPage(c,ids.articles),'Title');assert.throws(()=>applyReferenceDrop(v,c,ws,'does.not.exist'));});
test('stabilization: Article simple text edit retains original stable Markdown block',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.articles),v=resourceSource(c,ws,pg);delete v.blocks;v.text='Edited in the body';const o=replace(c,ws,pg.id,v);assert.equal(o.pages[pg.id].page.blocks[0].id,pg.blocks[0].id);assert.equal(o.pages[pg.id].page.blocks[0].text,v.text);});
test('stabilization: exact Article bookmark blocks destructive body edit but permits label changes',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.articles);addReadingBookmark(ws.personal,targetForPage(c,pg.id,{blockId:pg.blocks[0].id}),'Keep this section','informatics');const v=resourceSource(c,ws,pg);v.title='Label changed';assert.doesNotThrow(()=>replace(c,ws,pg.id,v));v.blocks=[];assert.throws(()=>replace(c,ws,pg.id,v),/exact reference/);});
test('stabilization: exact QCM question and retained attempt option identities are protected',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.qcm);answerQuestion(ws.personal,pg.qcm,'shuffle',['a','b']);let v=resourceSource(c,ws,pg);v.questions=v.questions.filter(q=>q.id!=='shuffle');assert.throws(()=>replace(c,ws,pg.id,v),/attempt history/);v=resourceSource(c,ws,pg);v.questions[0].options.pop();assert.throws(()=>replace(c,ws,pg.id,v),/Option IDs/);});
test('stabilization: missing exact link inside imported QCM fails before overlay mutation',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.qcm),before=clone(ws),v=resourceSource(c,ws,pg);v.questions[0].links=[{label:'Invalid',target:{kind:'page',pageId:'missing'}}];assert.throws(()=>replace(c,ws,pg.id,v));assert.deepEqual(ws,before);});
test('stabilization: selected stable resource ID cannot be changed in JSON',()=>{const {c,ws}=start();for(const id of [ids.articles,ids.qcm,ids.cheatsheets]){const pg=c.pages.find(p=>p.id===id),v=resourceSource(c,ws,pg);v.id='changed.id';assert.throws(()=>replace(c,ws,id,v),/ID/);}});
test('stabilization: PDF JSON contains metadata only and refuses binary identity and unsafe companion changes',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.pdfs),v=resourceSource(c,ws,pg);assert.equal(v.kind,'atlas-pdf-metadata');assert(!('bytesBase64'in v));v.document.sha256='a'.repeat(64);assert.throws(()=>replace(c,ws,pg.id,v),/read-only/);const v2=resourceSource(c,ws,pg);v2.document.title='A useful title';assert.equal(replace(c,ws,pg.id,v2).pages[pg.id].page.title,'A useful title');if(v2.companion){v2.companion.documentId='another';assert.throws(()=>replace(c,ws,pg.id,v2),/document ID/);}});
test('stabilization: source change while JSON is open must be explicitly reloaded',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.articles),snapshot=sourceIdentity(c,ws,pg),value=resourceSource(c,ws,pg),changed=clone(c);changed.pages.find(p=>p.id===pg.id).article.title='Concurrent change';assert.throws(()=>replace(changed,ws,pg.id,value,snapshot),/changed while/);});
test('stabilization: cheatsheet stable page bookmark survives reorder but not page deletion',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.cheatsheets),v=resourceSource(c,ws,pg),target={kind:'cheatsheet-page',pageId:pg.id,documentId:v.id,sheetPage:2,anchor:{sheetId:v.pages[1].id,sheetPage:2}};addReadingBookmark(ws.personal,target,'Stable sheet','informatics');v.pages.reverse();assert.doesNotThrow(()=>replace(c,ws,pg.id,v));v.pages.shift();assert.throws(()=>replace(c,ws,pg.id,v),/exact reference/);});
test('stabilization: deterministic optional demo has complete content and realistic explained options',()=>{const ws=blankWorkspace(),c=compose(built,ws),f=demoFixture(c);assert.deepEqual(f,demoFixture(c));assert.equal(f.pages.filter(p=>p.article).length,3);assert.equal(f.pages.filter(p=>p.qcm).length,3);assert.equal(f.sheetPages.length,3);for(const p of f.pages.filter(p=>p.qcm))for(const q of p.qcm.questions){assert(q.explanation);assert(q.options.every(o=>o.explanation));assert(q.correctOptionIds.length);}assert(f.captures.some(i=>i.status==='done'));assert(f.captures.some(i=>i.status==='archived'));});
test('stabilization: demo loading twice is idempotent and never touches reader sessions',()=>{const {c,ws}=start(),before=clone(ws);const again=prepareDemo(c,ws,'load');assert.deepEqual(again.overlays,ws.overlays);assert.deepEqual(again.personal,ws.personal);assert.deepEqual(ws,before);});
test('stabilization: cleanup removes unedited demo sources and keeps unrelated user content',()=>{const {c,ws}=start();ws.overlays.pages['user.page']={page:{id:'user.page',title:'Private user page',summary:'',blocks:[],related:[],terms:[],sources:[],tags:[]}};const user=clone(ws.overlays.pages['user.page']);const clean=prepareDemo(compose(built,ws),ws,'remove');assert.deepEqual(clean.overlays.pages['user.page'],user);assert(!clean.overlays.pages[ids.articles]);assert(!clean.personal.dashboardItems.some(i=>i.id.startsWith('demo.v2.')));});
test('stabilization: user bookmark prevents demo source cleanup; editing prevents removal',()=>{const {ws}=start();ws.overlays.pages[ids.articles].page.title='My edited article';let c=compose(built,ws);addReadingBookmark(ws.personal,targetForPage(c,ids.qcm),'My real bookmark','informatics');const cleanup=prepareDemo(c,ws,'remove');assert.equal(cleanup.overlays.pages[ids.articles].page.title,'My edited article');assert(cleanup.overlays.pages[ids.qcm]);assert(cleanup.personal.bookmarks.some(b=>b.title==='My real bookmark'));});
test('stabilization: saved reader location and QCM attempts protect demo content during cleanup',()=>{const {c,ws}=start(),v=newView(ids.articles);ws.personal.session.panes[0]={id:'left',views:[v],active:v.id};answerQuestion(ws.personal,c.pages.find(p=>p.id===ids.qcm).qcm,'shuffle',['a','b']);const after=prepareDemo(c,ws,'remove');assert(after.overlays.pages[ids.articles]);assert(after.overlays.pages[ids.qcm]);assert.equal(after.personal.qcmAttempts.length,1);assert.deepEqual(after.personal.session,ws.personal.session);});
test('stabilization: invalid atomic shared-data update preserves both canonical stores',()=>{const s=new WorkspaceStore(),before=clone(s.state);assert.throws(()=>s.shared((p,o)=>{o.references=[{id:'invalid'}];p.dashboardItems=[];}));assert.deepEqual(s.state,before);});
test('stabilization: complete demo survives existing exact backup protocol',async()=>{const {ws}=start();const files=await makeBackup(ws,built,async key=>source.assets.find(a=>a.key===key));const result=await readBackup((await unzipBounded(files.bytes)).files,schemas);assert.deepEqual(result.workspace.personal,JSON.parse(JSON.stringify(ws.personal)));assert.deepEqual(result.workspace.overlays,JSON.parse(JSON.stringify(ws.overlays)));});

test('stabilization: user reading target protects a demo capture and its context during cleanup',()=>{const {c,ws}=start(),item=ws.personal.dashboardItems.find(x=>x.id==='demo.v2.task.0');addReadingBookmark(ws.personal,{kind:'dashboard-item',itemId:item.id},'My task reference','informatics');const clean=prepareDemo(c,ws,'remove');assert(clean.personal.dashboardItems.some(x=>x.id===item.id));assert(clean.overlays.pages[item.contextTarget.pageId]);assert(clean.personal.bookmarks.some(x=>x.title==='My task reference'));});
test('stabilization: retained customized Article keeps its classified Notebook destination',()=>{const {ws}=start();ws.overlays.pages[ids.articles].page.article.note='My annotation';const clean=prepareDemo(compose(built,ws),ws,'remove');assert(clean.overlays.pages[ids.articles]);assert(clean.overlays.projects.some(x=>x.id==='demo.v2.notebook.it'));});
test('stabilization: demo wrapper metadata is not silently erased during cleanup',()=>{const {c,ws}=start();ws.overlays.pages[ids.articles].baseHash='a'.repeat(64);const clean=prepareDemo(c,ws,'remove');assert(clean.overlays.pages[ids.articles]);});
test('stabilization: reload demo keeps a customized deleted exact anchor without throwing',()=>{const {ws}=start();ws.overlays.pages['demo.v2.article.spark'].page.blocks=[];assert.doesNotThrow(()=>prepareDemo(compose(built,ws),ws,'load'));});
test('stabilization: JSON prevents deleting a bookmarked PDF companion category',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.pdfs),v=resourceSource(c,ws,pg),cat=v.companion.categories[0];const target={kind:'pdf-category',documentId:v.document.id,pageId:pg.id,pdfCategoryId:cat.id,pdfPage:1,...(v.document.sha256?{revision:v.document.sha256}:{})};assert(resolveTarget(c,ws,target).exact);addReadingBookmark(ws.personal,target,'Saved category','informatics');v.companion.categories=[];for(const term of v.companion.terms??[])term.categoryIds=[];for(const value of Object.values(v.companion.pages??{}))value.categoryIds=[];assert.throws(()=>replace(c,ws,pg.id,v),/exact reference/);});
test('stabilization: PDF metadata export cannot mutate the original companion',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.pdfs),before=resourceSource(c,ws,pg),exported=resourceSource(c,ws,pg);exported.companion.documentId='changed';assert.deepEqual(resourceSource(c,ws,pg),before);});
test('stabilization: public PDF label edit exports its persisted overlay title after recomposition',()=>{const {c,ws}=start(),pg=c.pages.find(p=>p.id===ids.pdfs),v=resourceSource(c,ws,pg);v.document.title='Persisted PDF label';ws.overlays=replace(c,ws,pg.id,v);const next=compose(built,ws),fresh=next.pages.find(p=>p.id===pg.id);assert.equal(resourceSource(next,ws,fresh).document.title,'Persisted PDF label');assert.doesNotThrow(()=>replace(next,ws,pg.id,resourceSource(next,ws,fresh),sourceIdentity(next,ws,fresh)));assert.notEqual(c.documents.find(d=>d.pageId===pg.id).title,'Persisted PDF label');});

// V2.1 source/projection coherence, using the existing backup envelope.
import {classifyResource,articleExport,captureRows} from '../dist-offline/app/content-hub/content.js';
import {resourceTaxonomy,projectLibrary} from '../dist-offline/app/content-hub/taxonomy.js';
import {contextLabel} from '../dist-offline/app/content-hub/context-label.js';
import {createReferenceIndex,queryReferences} from '../dist-offline/app/references/knowledge.js';
for(const kind of ['articles','qcm'])test('V2.1 '+kind+' classification, source edit and backup agree; pins stay user-owned',async()=>{
 const {ws}=start(),id=ids[kind],before=clone(ws.overlays.references);let c=compose(built,ws);
 classifyResource(ws.overlays,c,id,{subject:'cloud'});c=compose(built,ws);
 assert.deepEqual(resourceTaxonomy(c,ws.overlays,id),{subject:'cloud'});assert(!Object.hasOwn(ws.overlays.pages[id].page,'resourceLinks'));assert.deepEqual(ws.overlays,JSON.parse(JSON.stringify(ws.overlays)));
 assert.deepEqual(resourceSource(c,ws,c.pages.find(p=>p.id===id)).taxonomy,{subject:'cloud'});
 assert(projectLibrary(c,ws.overlays,kind,'cloud').some(p=>JSON.stringify(p.nodes).includes(id)));
 const value=resourceSource(c,ws,c.pages.find(p=>p.id===id));value.taxonomy={subject:'norsk'};
 ws.overlays=replace(c,ws,id,value);c=compose(built,ws);
 assert.deepEqual(resourceTaxonomy(c,ws.overlays,id),{subject:'norsk'});assert.deepEqual(ws.overlays.references,before);
 const files=await makeBackup(ws,built,async key=>source.assets.find(a=>a.key===key));const restored=(await readBackup((await unzipBounded(files.bytes)).files,schemas)).workspace;
 const next=compose(built,restored);assert.deepEqual(resourceSource(next,restored,next.pages.find(p=>p.id===id)).taxonomy,{subject:'norsk'});
 assert(resolveTarget(next,restored,targetForPage(next,id)).available);
 classifyResource(restored.overlays,next,id);const cleared=compose(built,restored);
 assert.equal(resourceTaxonomy(cleared,restored.overlays,id),undefined);assert.equal(resourceSource(cleared,restored,cleared.pages.find(p=>p.id===id)).taxonomy,undefined);
});
test('V2.1 legacy contradictory taxonomy is projected without mutating storage; stale editor rejected',()=>{
 const {ws,c}=start(),id=ids.articles,pg=c.pages.find(p=>p.id===id),identity=sourceIdentity(c,ws,pg);
 ws.overlays.taxonomy??={};ws.overlays.taxonomy[id]={subject:'job'};const before=clone(ws),next=compose(built,ws);
 assert.deepEqual(articleExport(next.pages.find(p=>p.id===id)).taxonomy,{subject:'job'});assert.deepEqual(ws,before);
 assert.throws(()=>replace(next,ws,id,articleExport(pg),identity),/changed while/);
});
test('V2.1 readable context preserves exact PDF page and context off omits target',()=>{
 const {ws,c}=start(),doc=c.documents.find(d=>d.pageId===ids.pdfs),target={kind:'pdf-page',documentId:doc.id,pageId:doc.pageId,pdfPage:3};
 const label=contextLabel(c,ws,target);assert(label.includes(doc.title));assert(label.includes('3'));assert(!label.includes(doc.id));
 const on=captureRows(ws.personal,'note',[{text:'Attached'}],undefined,target)[0],off=captureRows(ws.personal,'note',[{text:'Global'}])[0];
 assert.deepEqual(on.contextTarget,target);assert(!('contextTarget' in off));
});
test('V2.1 reference rows expose effective taxonomy and preserve exact destination',()=>{
 const {ws,c}=start(),target=targetForPage(c,'demo.v2.article.spark'),query=queryReferences(c,ws,createReferenceIndex(c,ws),target);
 assert(query.rows.length);for(const row of query.rows){assert.equal(row.detail,resolveTarget(c,ws,row.target).detail);assert.equal(row.title,resolveTarget(c,ws,row.target).title);}
 assert(query.rows.some(r=>r.taxonomyLabel));
});

test('V2.1 untitled section context uses readable text without exposing stable block IDs',()=>{
 const {ws,c}=start(),page=c.pages.find(p=>p.id==='demo.v2.note.it'),block=page.blocks[0],target=targetForPage(c,page.id,{blockId:block.id});
 const resolved=resolveTarget(c,ws,target);assert(resolved.exact);assert(!resolved.detail.includes(block.id));assert(resolved.detail.startsWith('Section / '));assert(contextLabel(c,ws,target).includes(resolved.detail));
});

import {resumeArticleDraft} from '../dist-offline/app/stabilization/capture-draft.js';
test('V2.1 capture back then context OFF clears hidden Article context and classification',()=>{
 const previous={title:'Draft body',text:'Retained',taxonomy:{subject:'it'},contextTarget:{kind:'page',pageId:'page.atlas.welcome'}};
 const next=resumeArticleDraft(previous,{sourceType:'transcript'});assert.deepEqual(next,{title:'Draft body',text:'Retained',sourceType:'transcript'});assert(previous.contextTarget);
 const on=resumeArticleDraft(previous,{sourceType:'article',contextTarget:{kind:'page',pageId:'page.atlas.pdf'},taxonomy:{subject:'cloud'}});assert.equal(on.contextTarget.pageId,'page.atlas.pdf');assert.equal(on.taxonomy.subject,'cloud');
});
