import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {blankWorkspace,blankPersonal,newView,navigate,current,toggleCompare,compose} from '../dist-offline/app/core/workspace.js';
import {activeSession,migratePersonal,selectWorkspace,allSessions,collapsePane,revealPane,toggleQuickLayout,categoryMatches} from '../dist-offline/app/core/workspace-slots.js';
import {READER_COMPANION,builtinCompanion} from '../dist-offline/app/companion/sample.js';
import {createWheelPager} from '../src/pdf/wheel-navigation.mjs';
import {validateCompanion,companionKey,pageTerms,categoryContains,pageWindow} from '../src/companion/validation.mjs';
import {prepareCompanionParts,AUTHORING_LIMITS} from '../src/companion/authoring.mjs';
import {validatePersonal} from '../src/storage/personal-validation.mjs';
import {validateState} from '../src/storage/state-validation.mjs';
import {readFiles} from '../tools/fs.mjs';
import {readWorkspace,loadSchemas} from '../src/core/packs.mjs';
import {makeBackup,readBackup,unzipBounded} from '../src/storage/archives.mjs';
import {WorkspaceStore} from '../dist-offline/app/storage/database.js';
const copy=structuredClone;
const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
const source=await readWorkspace(await readFiles('content'),schemas);
const built={packs:source.packs,groups:source.workspace.groups,assets:source.assets,releaseId:'122-unit'};
const doc=source.packs.flatMap(p=>p.documents).find(d=>d.id==='doc.atlas.pdf');
function setup(){const p=migratePersonal(blankPersonal());const s=activeSession(p),v=newView('page.atlas.pdf',{pdfPage:3,pdfRevision:doc.sha256,pdfOffset:.4});s.panes[0].views=[v];s.panes[0].active=v.id;s.screen='reader';s.expanded=['project.atlas.guide'];return p;}

test('1.2.2 migration preserves exact v2 personal data and slot 1 session',()=>{
 const legacy=blankPersonal();legacy.session.focus=true;legacy.session.theme='lavender';legacy.notes['example.page.overview']={text:'Keep me',pageId:'example.page.overview',updatedAt:12};
 const before=copy(legacy),p=migratePersonal(legacy);assert.equal(p.schemaVersion,3);assert.equal(p.activeWorkspaceSlot,1);assert.deepEqual(activeSession(p),before.session);assert.deepEqual(p.notes,before.notes);assert.deepEqual(legacy,before);assert.deepEqual(p.workspaceSlots,{});assert.deepEqual(migratePersonal(p),p);validatePersonal(p);
});
test('1.2.2 slots are canonical independent sessions, not snapshots swapped into session',()=>{
 const p=setup(),one=p.session,before=copy(one);selectWorkspace(p,2);assert.notEqual(activeSession(p),one);assert.equal(p.session,one);assert.deepEqual(p.session,before);assert.deepEqual(activeSession(p).panes[0].views,[]);assert.equal(activeSession(p).categoryFilter??null,null);selectWorkspace(p,1);assert.equal(activeSession(p),one);
});
test('1.2.2 activating all five slots does not create a sixth or clone document tabs',()=>{
 const p=setup();for(const n of [2,3,4,5]){selectWorkspace(p,n);assert.equal(activeSession(p).panes[0].views.length,0);}assert.equal(allSessions(p).length,5);const before=copy(p);selectWorkspace(p,5);assert.deepEqual(p,before);validatePersonal(p);
});
for(const invalid of [0,6,-1,1.5,'2',null])test('1.2.2 invalid workspace selector is rejected: '+invalid,()=>{assert.throws(()=>selectWorkspace(setup(),invalid));});
test('1.2.2 multiple slots can independently choose the same category',()=>{
 const p=setup();for(const n of [1,2]){selectWorkspace(p,n);activeSession(p).categoryFilter='informatics';}for(const n of [3,4,5]){selectWorkspace(p,n);activeSession(p).categoryFilter='norsk';}
 for(const n of [1,2])assert.equal(activeSession(p,n).categoryFilter,'informatics');for(const n of [3,4,5])assert.equal(activeSession(p,n).categoryFilter,'norsk');
 const before=copy(p.session);selectWorkspace(p,2);activeSession(p).categoryFilter=null;assert.deepEqual(p.session,before);validatePersonal(p);
});
test('1.2.2 categories filter explicit metadata, not display-name keywords',()=>{
 assert(categoryMatches('unclassified',null));assert(!categoryMatches('norsk-python-cloud','cloud'));assert(categoryMatches('project.samples.python','informatics'));assert(!categoryMatches('project.samples.python','norsk'));assert(categoryMatches('local.p','norsk',{'local.p':'norsk'}));assert(!categoryMatches('project.samples.python','informatics',{'project.samples.python':null}));
});
test('1.2.2 shared notes and content are not duplicated by switching workspaces',()=>{
 const ws=blankWorkspace();ws.personal=setup();ws.personal.notes['page.atlas.pdf']={text:'Shared',pageId:'page.atlas.pdf',updatedAt:123};const content=copy(ws.overlays);for(const n of [2,4,3,1,5,2])selectWorkspace(ws.personal,n);assert.deepEqual(ws.overlays,content);assert.equal(Object.keys(ws.personal.notes).length,1);assert(!('notes' in activeSession(ws.personal)));
});
for(const mode of ['continuous','parallel'])test('1.2.2 quick Book restores '+mode+' without closing or replacing anything',()=>{
 const p=setup(),v=activeSession(p).panes[0].views[0];v.history[0].presentation=mode;const before=copy(p);toggleQuickLayout(v,false);assert.equal(current(v).presentation,'book');toggleQuickLayout(v,false);assert.equal(current(v).presentation,mode);assert.equal(v.id,before.session.panes[0].views[0].id);assert.deepEqual(current(v).anchor,before.session.panes[0].views[0].history[0].anchor);assert.equal(v.history.length,1);assert.equal(p.session.panes.length,1);
});
for(const mode of ['single','continuous'])test('1.2.2 quick PDF Spread restores '+mode+' without replacing history',()=>{
 const p=setup(),v=activeSession(p).panes[0].views[0];v.history[0].pdfMode=mode;const anchor=copy(current(v).anchor);toggleQuickLayout(v,true);assert.equal(current(v).pdfMode,'spread');toggleQuickLayout(v,true);assert.equal(current(v).pdfMode,mode);assert.deepEqual(current(v).anchor,anchor);assert.equal(v.history.length,1);validatePersonal(p);
});
for(const index of [0,1])test('1.2.2 pane collapse/restore preserves tabs, ratio and physical positions: '+index,()=>{
 const p=setup(),s=activeSession(p);toggleCompare(s);s.ratio=62;const other=newView('page.atlas.language');s.panes[1].views=[other];s.panes[1].active=other.id;const panes=copy(s.panes),id=s.panes[index].id;
 collapsePane(s,id);assert.equal(s.collapsedPane,id);assert.notEqual(s.activePane,id);assert.deepEqual(s.panes,panes);assert.equal(s.ratio,62);validatePersonal(p);
 const before=copy(s);collapsePane(s,s.activePane);assert.deepEqual(s,before);revealPane(s,id);assert.equal(s.collapsedPane,null);assert.deepEqual(s.panes,panes);assert.equal(s.ratio,62);assert.equal(s.activePane,id);
});
test('1.2.2 cannot collapse the only pane or a missing pane',()=>{const p=setup(),s=activeSession(p),before=copy(s);collapsePane(s,s.activePane);collapsePane(s,'missing');revealPane(s,'missing');assert.deepEqual(s,before);});
test('1.2.2 closing Compare after a solo pane retains the populated survivor',()=>{const s=activeSession(setup());toggleCompare(s);const populated=s.panes[0];collapsePane(s,s.panes[1].id);toggleCompare(s);assert.deepEqual(s.panes,[populated]);assert.equal(s.collapsedPane,null);});
test('1.2.2 physical bookmarks navigate to their actual PDF page',()=>{const v=newView('pdf',{pdfPage:4,pdfRevision:doc.sha256});assert.equal(current(v).pdfPage,4);const next=navigate(v,'other',{pdfPage:9});assert.equal(current(next).pdfPage,9);assert.equal(current(v).pdfPage,4);});
const badState={
 'missing active slot':p=>{p.activeWorkspaceSlot=5;},'sixth slot':p=>{p.workspaceSlots['6']=copy(p.session);},'invalid category':p=>{p.session.categoryFilter='work';},'hidden active pane':p=>{toggleCompare(p.session);p.session.collapsedPane=p.session.activePane;},'six document tabs':p=>{for(let i=0;i<6;i++)p.session.panes[0].views.push(newView('x'));},'duplicate view IDs':p=>{p.session.panes[0].views.push(copy(p.session.panes[0].views[0]));},'bad companion view':p=>{p.session.panes[0].companionUi={x:{tab:'script'}};},'invalid physical offset':p=>{p.session.panes[0].views[0].history[0].anchor.pdfOffset=Infinity;},'unknown slot hidden corruption':p=>{selectWorkspace(p,2);activeSession(p).theme='unknown';selectWorkspace(p,1);}
};
for(const [name,change] of Object.entries(badState))test('1.2.2 all slots validate before restore: '+name,()=>{const p=setup();change(p);assert.throws(()=>validatePersonal(p));});

test('1.2.2 verified fixture companion validates and does not mutate its source',()=>{const before=copy(READER_COMPANION),valid=validateCompanion(READER_COMPANION,doc);assert.deepEqual(valid,before);assert.notEqual(valid,READER_COMPANION);assert.equal(builtinCompanion(doc),READER_COMPANION);assert.equal(builtinCompanion({...doc,sha256:'f'.repeat(64)}),undefined);});
test('1.2.2 physical page map, category ancestry and contextual terms agree',()=>{assert(pageTerms(READER_COMPANION,2).some(t=>t.id==='text-layer'));assert(categoryContains(READER_COMPANION.categories[0],4));assert.equal(pageWindow(85,137).length,40);assert.deepEqual(pageWindow(137,137),Array.from({length:17},(_,i)=>121+i));});
const badCompanion={
 'schema':c=>{c.schemaVersion=2;},'unknown top-level action':c=>{c.execute='alert(1)';},'wrong document':c=>{c.documentId='wrong';},'wrong revision':c=>{c.documentSha256='a'.repeat(64);},'missing known revision':c=>{delete c.documentSha256;},'wrong page count':c=>{c.pageCount=6;},'fractional physical page':c=>{c.terms[0].pageRefs=[1.5];},'out-of-range page':c=>{c.terms[0].pageRefs=[6];},'zero page':c=>{c.terms[0].pageRefs=[0];},'duplicate occurrence':c=>{c.terms[0].pageRefs=[1,1];},'reversed range':c=>{c.categories[0].pageRanges=[[5,1]];},'duplicate category':c=>{c.categories.push(copy(c.categories[0]));},'duplicate term':c=>{c.terms.push(copy(c.terms[0]));},'dangling category':c=>{c.terms[0].categoryIds=['missing'];},'dangling term':c=>{c.pages['2'].termIds=['missing'];},'wrong page key':c=>{c.pages['2'].page=3;},'unsafe nested key':c=>{c.pages['2'].constructor={};},'unknown category field':c=>{c.categories[0].url='https://example.org';},'nested category limit':c=>{let children=[];for(let n=0;n<12;n++)children=[{id:'cat'+n,title:'Category',children}];c.categories=children;},'invalid author':c=>{c.generatedBy='official';},'invalid review':c=>{c.reviewed='yes';},'excessively long label':c=>{c.terms[0].label='x'.repeat(241);},'invalid importance':c=>{c.terms[0].importance='critical';},'invalid timestamp':c=>{c.createdAt=-1;}
};
for(const [name,change] of Object.entries(badCompanion))test('1.2.2 companion validation rejects '+name,()=>{const c=copy(READER_COMPANION);change(c);assert.throws(()=>validateCompanion(c,doc));});
test('1.2.2 companion rejects oversize JSON before parsing',()=>{assert.throws(()=>validateCompanion('x'.repeat(2*1024*1024+1),doc),/2 MiB/);});
test('1.2.2 prototype pollution cannot enter companion storage',()=>{assert.throws(()=>validateCompanion('{"__proto__":{"polluted":true}}',doc));assert.equal({}.polluted,undefined);});
test('1.2.2 textual markup is inert content, not a remote-asset instruction',()=>{const c=copy(READER_COMPANION);c.terms[0].definition='<img src="https://example.org/leak" onerror="alert(1)">';assert.equal(validateCompanion(c,doc).terms[0].definition,c.terms[0].definition);});

function wheel(overrides={}){return {deltaY:100,deltaX:0,deltaMode:0,now:0,mode:'single',top:false,bottom:true,...overrides};}
test('1.2.2 wheel page-turns only at the page edge',()=>{const next=createWheelPager();assert.equal(next(wheel({bottom:false})),0);assert.equal(next(wheel({now:50})),1);});
test('1.2.2 a continuous trackpad burst can turn only once',()=>{const next=createWheelPager();let turns=0;for(let n=0;n<200;n++)turns+=next(wheel({deltaY:15,now:n*12}));assert.equal(turns,1);assert.equal(next(wheel({now:3000})),1);});
test('1.2.2 wheel supports a later deliberate reverse gesture',()=>{const next=createWheelPager();assert.equal(next(wheel()),1);assert.equal(next(wheel({deltaY:-100,top:true,bottom:false,now:700})),-1);});
for(const mode of ['continuous'])test('1.2.2 '+mode+' scroll is never hijacked',()=>{const next=createWheelPager();for(const n of [0,800,1600])assert.equal(next(wheel({mode,now:n,deltaY:9000})),0);});
for(const blocked of [{blocked:true},{deltaX:200},{deltaY:0}])test('1.2.2 wheel input safety '+JSON.stringify(blocked),()=>{assert.equal(createWheelPager()(wheel(blocked)),0);});
test('1.2.2 small wheel deltas accumulate and line/page modes are normalized',()=>{const next=createWheelPager();assert.equal(next(wheel({deltaY:2,deltaMode:1})),0);assert.equal(next(wheel({deltaY:4,deltaMode:1,now:20})),1);assert.equal(createWheelPager()(wheel({deltaY:1,deltaMode:2})),1);});
test('1.2.2 cooldown prevents two separate short bursts from skipping pages',()=>{const next=createWheelPager();assert.equal(next(wheel()),1);assert.equal(next(wheel({now:300})),0);assert.equal(next(wheel({now:600})),1);});

function fakePdf(count,text=n=>'Page '+n){return {numPages:count,async getPage(n){return {async getTextContent(){const s=text(n);return {items:s?[{str:s,hasEOL:true}]:[]};}};}};}
test('1.2.2 authoring is bounded, page-addressed, explicit, and local-only',async()=>{
 const fetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('Unexpected network request');};try{const result=await prepareCompanionParts(fakePdf(45),{...doc,pageCount:45});assert.equal(result.parts.length,2);assert.deepEqual(result.parts[0].coverage,{first:1,last:40,documentPages:45});assert.equal(result.parts[1].pages[4].page,45);assert.equal(result.parts[0].template.documentSha256,doc.sha256);assert.match(result.parts[0].instructions,/source data/);}finally{globalThis.fetch=fetch;}
});
test('1.2.2 authoring discloses text truncation and image-only pages',async()=>{const result=await prepareCompanionParts(fakePdf(2,n=>n===1?'x'.repeat(20000):''),doc);const pages=result.parts[0].pages;assert.equal(pages[0].truncated,true);assert.equal(pages[0].text.length,AUTHORING_LIMITS.charactersPerPage);assert.equal(pages[1].hasSelectableText,false);assert.equal(pages[1].text,'');});
test('1.2.2 cancelled extraction does not continue reading pages',async()=>{const ac=new AbortController();ac.abort();await assert.rejects(prepareCompanionParts(fakePdf(5),doc,{signal:ac.signal}),/Cancelled/);});
test('1.2.2 authoring rejects invalid physical range without an extraction',async()=>{for(const range of [{startPage:0},{startPage:4,endPage:2},{endPage:10}])await assert.rejects(prepareCompanionParts(fakePdf(5),doc,range));});

test('1.2.2 exact complete backup includes all five slots, companion and PDF bytes',async()=>{
 const ws=blankWorkspace();ws.personal=setup();
 for(const slot of [1,2,3,4,5]){selectWorkspace(ws.personal,slot);const s=activeSession(ws.personal);s.categoryFilter=slot<3?'informatics':'norsk';s.compactTop=slot===3;const v=newView('page.atlas.pdf',{pdfPage:slot,pdfRevision:doc.sha256,pdfOffset:slot*.1});s.panes[0].views=[v];s.panes[0].active=v.id;s.screen='reader';s.panes[0].companionUi={[companionKey(doc)]:{open:slot%2===0,tab:'pages',collapsed:['layouts']}};s.panes[0].readerChromeCollapsed=slot===4;}
 ws.overlays.companions={[companionKey(doc)]:copy(READER_COMPANION)};
 ws.overlays.categories={'project.atlas.guide':'personal'};
 ws.overlays.glossary=[{id:'term.promoted',label:'Physical page',definition:'An original study definition.',pageIds:['page.atlas.pdf'],pdfRefs:[{pageId:doc.pageId,documentId:doc.id,revision:doc.sha256,pages:[1,3]}]}];
 validateState(ws,schemas);const before=copy(ws);
 const backup=await makeBackup(ws,built,async key=>source.assets.find(a=>a.key===key));
 assert.equal(backup.snapshot.schemaVersion,3);const parsed=await readBackup((await unzipBounded(backup.bytes)).files,schemas);
 assert.deepEqual(parsed.workspace.personal,before.personal);assert.deepEqual(parsed.workspace.overlays,before.overlays);assert.deepEqual(ws,before);assert.equal(parsed.workspace.assets.length,3);
 for(const a of source.assets)assert.deepEqual(parsed.workspace.assets.find(x=>x.key===a.key).bytes,a.bytes);
 const store=new WorkspaceStore();store.setLoaded(parsed.workspace);assert.deepEqual(store.state.personal,before.personal);
});
test('1.2.2 legacy v2 backup is retained exactly by parser and migrated at load boundary',async()=>{const ws=blankWorkspace(),legacy=copy(ws.personal);const b=await makeBackup(ws,built,async k=>source.assets.find(a=>a.key===k));assert.equal(b.snapshot.schemaVersion,2);const parsed=await readBackup((await unzipBounded(b.bytes)).files,schemas);assert.deepEqual(parsed.workspace.personal,legacy);const store=new WorkspaceStore();store.setLoaded(parsed.workspace);assert.equal(store.state.personal.schemaVersion,3);assert.deepEqual(store.state.personal.session,legacy.session);});
test('1.2.2 invalid inactive slot is rejected before restore, not silently discarded',async()=>{const ws=blankWorkspace();ws.personal=setup();selectWorkspace(ws.personal,2);activeSession(ws.personal).panes=[];selectWorkspace(ws.personal,1);assert.throws(()=>validateState(ws,schemas));});
test('1.2.2 companion revision keys and promoted page references validate',()=>{const ws=blankWorkspace();ws.personal=setup();ws.overlays.companions={'bad-key':copy(READER_COMPANION)};assert.throws(()=>validateState(ws,schemas),/revision key/);delete ws.overlays.companions;ws.overlays.glossary=[{id:'g',label:'g',definition:'g',pageIds:[],pdfRefs:[{pageId:doc.pageId,documentId:doc.id,pages:[-1]}]}];assert.throws(()=>validateState(ws,schemas));});
test('1.2.2 all representative sample notebooks place canonical PDFs before reading',()=>{const samples=source.packs.find(p=>p.manifest.id==='study.samples');assert.equal(samples.projects.length,9);assert.equal(samples.pages.length,10);for(const p of samples.projects){assert.equal(p.nodes[0].title,'PDFs');assert.equal(p.nodes[1].title,'Start reading');}assert.equal(source.packs[0].projects[0].nodes[0].id,'node.atlas.documents');});

test('1.2.2 real Spark companion uses six physical pages, not the 30 concept numbers',async()=>{
 const {SPARK_COMPANION}=await import('../dist-offline/app/companion/spark-sample.js');
 const original=source.packs.flatMap(p=>p.documents).find(d=>d.id==='doc.pdfatlas.spark-concepts');
 validateCompanion(SPARK_COMPANION,original);assert.equal(SPARK_COMPANION.pageCount,6);assert.equal(SPARK_COMPANION.terms.length,30);assert.equal(Object.keys(SPARK_COMPANION.pages).length,6);assert.equal(SPARK_COMPANION.reviewed,false);
 assert.equal(builtinCompanion(original).documentSha256,original.sha256);
});
test('1.2.2 local AI export includes its exact machine-readable companion schema',async()=>{
 const result=await prepareCompanionParts({numPages:1,getPage:async()=>({getTextContent:async()=>({items:[{str:'source text'}]})})},doc);
 assert.equal(result.parts[0].schema.additionalProperties,false);assert.equal(result.parts[0].schema.properties.schemaVersion.const,1);
 assert(result.parts[0].schema.$defs.term.required.includes('pageRefs'));
});
