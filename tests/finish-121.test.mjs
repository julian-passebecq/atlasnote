import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {visibleLibraryNode} from '../dist-offline/app/core/library-projection.js';
import {blankWorkspace,newView,current,compose} from '../dist-offline/app/core/workspace.js';
import {createFullscreenController} from '../dist-offline/app/core/fullscreen.js';
import {makeRemark,pdfAnchor,repairAbsentPersonalOptionals} from '../dist-offline/app/core/personal-state.js';
import {makeBackup,unzipBounded,readBackup} from '../src/storage/archives.mjs';
import {loadSchemas} from '../src/core/packs.mjs';
const built=JSON.parse(await fs.readFile('dist-offline/content.json','utf8'));
const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
const catalogue=compose(built,blankWorkspace()),pdfs=new Set(catalogue.documents.map(d=>d.pageId));
function project(nodes,mode,archived=new Set()) {return nodes.filter(n=>visibleLibraryNode(n,pdfs,archived,mode)).map(n=>({id:n.id,...(n.pageId?{pageId:n.pageId}:{}),...(n.children?{children:project(n.children,mode,archived)}:{})}));}
function leaves(nodes){return nodes.flatMap(n=>n.pageId?[n.pageId]:leaves(n.children??[]));}
test('1.2.1 actual Notes projection excludes both public PDFs and their emptied notebook',()=>{
 const p=catalogue.projects.find(p=>p.id==='project.pdfatlas');assert(p);assert.deepEqual(project(p.nodes,'notes'),[]);
 const ids=catalogue.projects.flatMap(p=>leaves(project(p.nodes,'notes')));assert(ids.length>0);assert(ids.every(id=>!pdfs.has(id)));
 assert(!ids.includes('page.pdfatlas.spark-concepts'));assert(!ids.includes('page.pdfatlas.pyspark-pandas'));
});
test('1.2.1 actual PDF projection contains only canonical PDF leaves',()=>{const ids=catalogue.projects.flatMap(p=>leaves(project(p.nodes,'pdfs')));assert.equal(new Set(ids).size,pdfs.size);assert(ids.every(id=>pdfs.has(id)));});
test('1.2.1 Notes -> PDF -> Notes is deterministic and leaves canonical source untouched',()=>{const before=structuredClone(catalogue);const first=catalogue.projects.map(p=>project(p.nodes,'notes'));catalogue.projects.map(p=>project(p.nodes,'pdfs'));assert.deepEqual(catalogue.projects.map(p=>project(p.nodes,'notes')),first);assert.deepEqual(catalogue,before);});
for(const mode of ['notes','pdfs'])test('1.2.1 mixed folders retain only matching leaves: '+mode,()=>{const tree=[{id:'mix',children:[{id:'n',pageId:'page.atlas.layouts'},{id:'p',pageId:'page.atlas.pdf'},{id:'empty',children:[]}]}];assert.deepEqual(leaves(project(tree,mode)),[mode==='notes'?'page.atlas.layouts':'page.atlas.pdf']);assert.equal(project(tree,mode)[0].children.length,1);});
for(const mode of ['notes','pdfs'])for(const key of ['ancestor','node','page'])test('1.2.1 archived '+key+' stays absent in '+mode,()=>{const id=mode==='notes'?'page.atlas.layouts':'page.atlas.pdf',node={id:'ancestor',children:[{id:'node',pageId:id}]};assert.equal(project([node],mode,new Set([key==='page'?id:key])).length,0);});
test('1.2.1 projections never mutate open PDF view/history/remarks/bookmark state',()=>{const ws=blankWorkspace(),v=newView('page.atlas.pdf');current(v).pdfPage=3;current(v).zoom=1.5;current(v).rotation=90;current(v).pdfMode='spread';ws.personal.session.panes[0].views=[v];ws.personal.notes['page.atlas.pdf']=makeRemark('Exact remark','page.atlas.pdf',1,'a'.repeat(64),pdfAnchor(3,'a'.repeat(64)));const before=structuredClone(ws);for(const mode of ['notes','pdfs','notes'])catalogue.projects.forEach(p=>project(p.nodes,mode));assert.deepEqual(ws,before);});
test('1.2.1 PDF anchor omits an absent revision without dropping a real value',()=>{assert.deepEqual(pdfAnchor(2),{pdfPage:2});assert(!Object.hasOwn(pdfAnchor(2),'pdfRevision'));assert.deepEqual(pdfAnchor(2,'0'.repeat(64)),{pdfPage:2,pdfRevision:'0'.repeat(64)});});
test('1.2.1 note remark is exactly JSON representable',()=>{const n=makeRemark('Line 1\nLine 2','page.atlas.layouts',123);assert.deepEqual(n,JSON.parse(JSON.stringify(n)));assert.equal(Object.hasOwn(n,'anchor'),false);assert.equal(Object.hasOwn(n,'revision'),false);});
test('1.2.1 PDF remark preserves revision and physical anchor exactly',()=>{const n=makeRemark('PDF','page.atlas.pdf',0,'a'.repeat(64),pdfAnchor(5,'a'.repeat(64)));assert.deepEqual(n,JSON.parse(JSON.stringify(n)));assert.equal(n.updatedAt,0);assert.equal(n.anchor.pdfPage,5);});
test('1.2.1 legacy absence repair is bounded, nonmutating and idempotent',()=>{
 const p=blankWorkspace().personal,v=newView('page.atlas.pdf');p.session.panes[0].views=[v];v.history[0].anchor={pdfPage:2,pdfRevision:undefined};v.history[0].scroll=undefined;p.notes.note={text:'keep\nexact',pageId:'page.atlas.layouts',updatedAt:123,anchor:undefined,revision:undefined};p.bookmarks=[{id:'bookmark.one',pageId:'page.atlas.pdf',title:'keep',createdAt:1,anchor:undefined}];p.ratings.one='green';
 const before=structuredClone(p),fixed=repairAbsentPersonalOptionals(p);assert.deepEqual(p,before);assert.deepEqual(fixed,JSON.parse(JSON.stringify(p)));assert.deepEqual(repairAbsentPersonalOptionals(fixed),fixed);assert.equal(fixed.notes.note.updatedAt,123);assert.equal(fixed.session.panes[0].views[0].history[0].anchor.pdfPage,2);
});
async function asset(key){const a=built.assets.find(x=>x.key===key);return a?{...a,bytes:new Uint8Array(await fs.readFile('dist-offline/'+a.path))}:undefined;}
test('1.2.1 exact personal equality through actual ZIP parser after legacy absence repair',async()=>{const ws=blankWorkspace();ws.personal.notes.note=makeRemark('Exact lines\nTwo','page.atlas.layouts',99);ws.personal.session.libraryMode='pdfs';const result=await makeBackup(ws,built,asset),restored=await readBackup((await unzipBounded(result.bytes)).files,schemas);assert.deepEqual(restored.workspace.personal,ws.personal);});
test('1.2.1 asynchronous backup freezes personal state before its first asset await',async()=>{
 const ws=blankWorkspace();ws.personal.notes.note=makeRemark('Before serialization','page.atlas.layouts',1);const expected=structuredClone(ws.personal);let mutated=false;
 const result=await makeBackup(ws,built,async key=>{if(!mutated){mutated=true;ws.personal.notes.note.text='Changed while assets are loading';ws.personal.session.theme='slate';}return asset(key);});
 assert(mutated);const {files}=await unzipBounded(result.bytes),out=JSON.parse(new TextDecoder().decode(files.get('backup.json')));assert.deepEqual(out.workspace.personal,expected);assert.notDeepEqual(out.workspace.personal,ws.personal);
});
function fakeFullscreen(mode='grant'){
 const doc=new EventTarget();doc.fullscreenElement=null;let requests=0,exits=0,callbacks=0,resolve;
 const root={requestFullscreen(){requests++;if(mode==='reject')return Promise.reject(Error('Denied'));if(mode==='throw')throw Error('Unsupported');if(mode==='deferred')return new Promise(r=>{resolve=()=>{doc.fullscreenElement=root;doc.dispatchEvent(new Event('fullscreenchange'));r();};});doc.fullscreenElement=root;doc.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();}};
 doc.exitFullscreen=()=>{exits++;doc.fullscreenElement=null;doc.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();};
 const controller=createFullscreenController(root,doc,()=>callbacks++);
 return {doc,root,controller,grant:()=>resolve(),state:()=>({requests,exits,callbacks})};
}
const tick=()=>new Promise(r=>setImmediate(r));
test('1.2.1 Focus requests Fullscreen API synchronously from enter',async()=>{const f=fakeFullscreen();f.controller.enter();assert.equal(f.state().requests,1);assert.equal(f.doc.fullscreenElement,f.root);await tick();f.controller.dispose();});
test('1.2.1 constructing/restoring controller never automatically requests fullscreen',()=>{const f=fakeFullscreen();assert.equal(f.state().requests,0);f.controller.dispose();});
for(const mode of ['reject','throw'])test('1.2.1 fullscreen '+mode+' retains CSS Focus (no exit callback)',async()=>{const f=fakeFullscreen(mode);f.controller.enter();await tick();assert.equal(f.state().requests,1);assert.equal(f.state().callbacks,0);f.controller.dispose();});
test('1.2.1 browser Escape/fullscreenchange synchronizes focus exit once',async()=>{const f=fakeFullscreen();f.controller.enter();await tick();f.doc.fullscreenElement=null;f.doc.dispatchEvent(new Event('fullscreenchange'));f.doc.dispatchEvent(new Event('fullscreenchange'));assert.equal(f.state().callbacks,1);f.controller.dispose();});
test('1.2.1 programmatic Focus exit calls exitFullscreen only for our app',async()=>{const f=fakeFullscreen();f.controller.enter();await tick();f.controller.exit();assert.equal(f.state().exits,1);f.doc.fullscreenElement={};f.controller.exit();assert.equal(f.state().exits,1);f.controller.dispose();});
test('1.2.1 unrelated element fullscreen is never acquired or exited',()=>{const f=fakeFullscreen();f.doc.fullscreenElement={};f.controller.enter();f.controller.exit();assert.deepEqual(f.state(),{requests:0,exits:0,callbacks:0});f.controller.dispose();});
test('1.2.1 rapid Focus cancellation cannot leave a late granted fullscreen',async()=>{const f=fakeFullscreen('deferred');f.controller.enter();f.controller.exit();f.grant();await tick();assert.equal(f.doc.fullscreenElement,null);assert.equal(f.state().exits,1);f.controller.dispose();});
test('1.2.1 disposed controller cleans listeners and a pending fullscreen grant',async()=>{const f=fakeFullscreen('deferred');f.controller.enter();f.controller.dispose();f.grant();await tick();assert.equal(f.doc.fullscreenElement,null);assert.equal(f.state().callbacks,0);});
test('1.2.1 all public pdfatlas URLs are pinned and byte/page metadata is retained',async()=>{const config=JSON.parse(await fs.readFile('config/pdfatlas.json')),m=JSON.parse(await fs.readFile('config/pdfatlas.library.json'));const base='https://raw.githubusercontent.com/julian-passebecq/pdfatlas/fa5e83f7825cdc837078f87c5e130cb012332195/';assert.equal(config.baseUrl,base);for(const d of catalogue.documents.filter(d=>d.packId==='pdfatlas.public')){const e=m.entries.find(e=>e.id===d.id);assert.equal(d.source.url,base+e.relativePath);assert.equal(d.sha256,e.sha256);assert.equal(d.bytes,e.bytes);assert.equal(d.pageCount,e.pageCount);}});
test('1.2.1 hosted and compatibility builders cannot overwrite each other',async()=>{const p=JSON.parse(await fs.readFile('package.json'));assert.equal(p.scripts.build,'node tools/build-vite.mjs');assert.equal(p.scripts['build:offline'],'node tools/build.mjs');assert.equal(p.scripts.pretest,'npm run build:offline');const code=await fs.readFile('tools/build.mjs','utf8');assert(!code.includes("fs.rm('dist'"));assert(code.includes("fs.rm('dist-offline'"));});
test('1.2.1 reader source has no PDF metadata intro and retains failure boundary',async()=>{const p=await fs.readFile('src/pdf/PdfReader.tsx','utf8'),online=await fs.readFile('src/online/PdfEngine.tsx','utf8');assert(!p.includes('pdf-intro'));assert(!online.includes('pdf-intro'));assert(online.includes('DocumentInfo'));assert(p.includes('EngineBoundary'));assert(p.includes('fetchTrustedPdf'));});

test('Discovery totals exclude PDF-only, hidden and archived projects without counting duplicate leaves',async()=>{
 const {libraryProjectionCounts}=await import('../dist-offline/app/core/library-projection.js');
 const projects=[{id:'mixed',nodes:[{id:'n',pageId:'note'},{id:'p',pageId:'pdf'},{id:'n-alias',pageId:'note'}]},{id:'pdf-only',nodes:[{id:'q',pageId:'pdf2'}]},{id:'hidden',nodes:[{id:'r',pageId:'hidden-note'}]}];
 const pdfs=new Set(['pdf','pdf2']),hidden=new Set(['hidden']);
 assert.deepEqual(libraryProjectionCounts(projects,pdfs,new Set(),'notes',hidden),{projects:1,pages:1});
 assert.deepEqual(libraryProjectionCounts(projects,pdfs,new Set(),'pdfs',hidden),{projects:2,pages:2});
 assert.deepEqual(libraryProjectionCounts(projects,pdfs,new Set(['mixed']),'notes',hidden),{projects:0,pages:0});
});

test('Emergency backup snapshot retains canonical unsaved work after a storage error',async()=>{
 const {store}=await import('../dist-offline/app/storage/database.js');
 const {captureWorkspaceSnapshot}=await import('../dist-offline/app/storage/workspace-snapshot.js');
 const savedState=store.state,savedError=store.error;
 try{store.state=blankWorkspace();store.state.personal.notes.example={pageId:'example',text:'UNSAVED WORK',updatedAt:7};store.error='Synthetic storage write failure';
 const snapshot=await captureWorkspaceSnapshot();assert.deepEqual(snapshot.personal,store.state.personal);assert.notEqual(snapshot,store.state);assert.equal(snapshot.personal.notes.example.text,'UNSAVED WORK');}
 finally{store.state=savedState;store.error=savedError;}
});
