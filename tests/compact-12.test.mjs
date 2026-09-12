import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {blankWorkspace,newView,current,toggleCompare,compose} from '../dist/app/core/workspace.js';
import {parseHashRoute,shouldOpenStartupRoute} from '../dist/app/core/startup-route.js';
import {visibleLibraryNode} from '../dist/app/core/library-projection.js';
import {THEME_LABELS} from '../dist/app/core/model.js';
import {isPdfatlasUrl,isTrustedPdfatlasDocument,fetchTrustedPdf} from '../dist/app/pdf/external-policy.js';
import {validateState} from '../src/storage/state-validation.mjs';
import {loadSchemas,readWorkspace} from '../src/core/packs.mjs';
import {makeBackup,readBackup,unzipBounded} from '../src/storage/archives.mjs';
import {readFiles} from '../tools/fs.mjs';
import {validateManifest} from '../tools/sync-pdfatlas.mjs';
const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
const built=JSON.parse(await fs.readFile('dist/content.json','utf8'));
const files=await readFiles('content'), review=JSON.parse(await fs.readFile('content/publication-review.json','utf8')).packs;
const manifest=JSON.parse(await fs.readFile('config/pdfatlas.library.json','utf8'));
const base=JSON.parse(await fs.readFile('config/pdfatlas.json','utf8')).baseUrl;
function session(){const s=blankWorkspace().personal.session,v=newView('page.atlas.pdf');s.panes[0].views=[v];s.panes[0].active=v.id;toggleCompare(s);return s;}
const route={id:'page.atlas.pdf',collection:false};
for(const name of ['empty active Compare pane','inactive tab','inactive history entry'])test('1.2 startup preserves exact session: '+name,()=>{
 const s=session();if(name==='inactive tab'){const p=s.panes[0],v=newView('page.atlas.layouts');p.views.push(v);p.active=v.id;}if(name==='inactive history entry'){const v=s.panes[0].views[0];v.history.push({...current(newView('page.atlas.language'))});v.cursor=1;}
 const before=structuredClone(s);assert.equal(shouldOpenStartupRoute(s,route),false);assert.deepEqual(s,before);
});
test('1.2 genuinely new startup link navigates; an empty workspace accepts a link',()=>{assert(shouldOpenStartupRoute(session(),{id:'page.atlas.welcome',collection:false}));assert(shouldOpenStartupRoute(blankWorkspace().personal.session,route));});
test('1.2 collection startup route retains canonical identity and does not alias a page',()=>{const s=session();s.panes[0].views[0]=newView('node.atlas.documents');current(s.panes[0].views[0]).collectionId='node.atlas.documents';assert.equal(shouldOpenStartupRoute(s,{id:'node.atlas.documents',collection:true}),false);assert.equal(shouldOpenStartupRoute(s,{id:'node.atlas.documents',collection:false}),true);});
test('1.2 hash parser preserves block IDs and rejects malformed URI encodings',()=>{assert.deepEqual(parseHashRoute('#/page/page.atlas.pdf?block=a%2Eb'),{id:'page.atlas.pdf',collection:false,anchor:{blockId:'a.b'}});assert.deepEqual(parseHashRoute('#/collection/folder'),{id:'folder',collection:true});assert.equal(parseHashRoute('#/other/foo'),undefined);assert.throws(()=>parseHashRoute('#/page/%zz'));});
const tree={id:'root',children:[{id:'note',pageId:'n'},{id:'empty',children:[{id:'nested-note',pageId:'n2'}]},{id:'deep',children:[{id:'pdf',pageId:'p'}]}]},pdfs=new Set(['p']);
test('1.2 PDF projection recursively filters notes and empty branches without mutations',()=>{const before=structuredClone(tree),archived=new Set();assert(visibleLibraryNode(tree,pdfs,archived,'pdfs'));assert(!visibleLibraryNode(tree.children[0],pdfs,archived,'pdfs'));assert(!visibleLibraryNode(tree.children[1],pdfs,archived,'pdfs'));assert(visibleLibraryNode(tree.children[2],pdfs,archived,'pdfs'));assert.deepEqual(tree,before);});
test('1.2 archived PDF leaf or ancestor disappears; Notes mode preserves mixed tree',()=>{for(const id of ['p','pdf','deep'])assert(!visibleLibraryNode(tree,pdfs,new Set([id]),'pdfs'));for(const n of tree.children)assert(visibleLibraryNode(n,pdfs,new Set(),'notes'));});
test('1.2 precisely five theme IDs and labels, old backups still accepted',()=>{assert.deepEqual(THEME_LABELS,{fluent:'Fluent Blue',neutral:'Neutral/Sage',academic:'Academic Paper',lavender:'Soft Lavender',slate:'Dark Slate'});for(const theme of ['fluent','neutral','academic']){const ws=blankWorkspace();ws.personal.session.theme=theme;delete ws.personal.session.libraryMode;assert(validateState(ws,schemas));}});
for(const theme of Object.keys(THEME_LABELS))test('1.2 real backup serializer and parser roundtrip theme and PDF mode: '+theme,async()=>{
 const ws=blankWorkspace();ws.personal.session=session();ws.personal.session.theme=theme;ws.personal.session.libraryMode='pdfs';ws.personal.ratings['page.atlas.pdf']='green';ws.personal.notes['page.atlas.layouts']={pageId:'page.atlas.layouts',text:'private fixture',updatedAt:1};assert(validateState(ws,schemas));
 const out=await makeBackup(ws,built,async key=>{const a=built.assets.find(x=>x.key===key);return a?{...a,bytes:new Uint8Array(await fs.readFile('dist/'+a.path))}:undefined;});const restored=(await readBackup((await unzipBounded(out.bytes)).files,schemas)).workspace;assert.deepEqual(restored.personal,ws.personal);assert.deepEqual(restored.overlays,ws.overlays);
});
test('1.2 invalid themes and mode values cannot enter restored state',()=>{for(const [k,v] of [['theme','solarized'],['theme',null],['libraryMode','all-pdf']]){const ws=blankWorkspace();ws.personal.session[k]=v;assert.throws(()=>validateState(ws,schemas));}});
const url=base+'library/data-engineering/apache-spark/example.pdf';
test('1.2 exact repo and pinned SHA are trusted URL forms',()=>{assert(isPdfatlasUrl(url));assert(isPdfatlasUrl(url.replace('/main/','/'+'a'.repeat(40)+'/')));});
const hostile=[url.replace('https:','http:'),url.replace('raw.githubusercontent.com','raw.githubusercontent.com.evil.test'),url.replace('julian-passebecq','other-user'),url.replace('/pdfatlas/','/pdfatlas-evil/'),url.replace('/main/','/feature/'),url+'?token=x',url+'#page=3',url.replace('https://','https://u:p@'),url.replace('/library/','/library/../library/'),url.replace('example.pdf','%65xample.pdf'),url.replace('.pdf','.html'),'https://github.com/julian-passebecq/pdfatlas/blob/main/a.pdf',null];
for(const [i,bad]of hostile.entries())test('1.2 arbitrary external URL retains consent: hostile case '+i,()=>assert.equal(isPdfatlasUrl(bad),false));
const bytes=new TextEncoder().encode('%PDF-1.7\nSynthetic unit-test bytes, not a rendered document.\n');
const doc={id:'doc.unit',pageId:'page.unit',packId:'pdfatlas.public',visibility:'public',source:{kind:'https',url},bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
test('1.2 trusted URL alone cannot bypass pack ownership, visibility or hash',()=>{assert(isTrustedPdfatlasDocument(doc));for(const patch of [{packId:'private.other'},{visibility:'private'},{source:{kind:'external',url}},{sha256:''}])assert(!isTrustedPdfatlasDocument({...doc,...patch}));});
test('1.2 trusted fetch verifies exact bytes and suppresses credentials/referrers/redirects',async t=>{let options;t.mock.method(globalThis,'fetch',async(u,o)=>{assert.equal(u,url);options=o;return new Response(bytes);});const got=await fetchTrustedPdf(doc,new AbortController().signal);assert.deepEqual(got,bytes);assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.equal(options.referrerPolicy,'no-referrer');});
for(const [name,response,patch,pattern]of [
 ['HTTP failure',()=>new Response('missing',{status:404}),{},/HTTP 404/],
 ['byte count mismatch',()=>new Response(bytes),{bytes:1},/byte count/],
 ['HTML masquerade',()=>new Response(new TextEncoder().encode('<html>bad</html>')),{bytes:undefined},/not return a PDF/],
 ['hash mismatch',()=>new Response(bytes),{sha256:'a'.repeat(64)},/SHA-256/],
 ['declared oversized response',()=>new Response(bytes,{headers:{'Content-Length':String(101*1024*1024)}}),{},/100 MB/],
 ['redirected response',()=>({ok:true,redirected:true}),{},/Redirected/]
])test('1.2 trusted fetch fails closed: '+name,async t=>{t.mock.method(globalThis,'fetch',async()=>response());await assert.rejects(fetchTrustedPdf({...doc,...patch},new AbortController().signal),pattern);});
test('1.2 arbitrary URL is rejected before making any fetch',async t=>{let count=0;t.mock.method(globalThis,'fetch',async()=>{count++;throw Error('should not fetch');});await assert.rejects(fetchTrustedPdf({...doc,packId:'other'},new AbortController().signal),/not a configured/);assert.equal(count,0);});
test('1.2 manifest is valid and commits can be pinned in the single config base',()=>{assert(validateManifest(manifest,base));assert(validateManifest(manifest,base.replace('/main/','/'+'d'.repeat(40)+'/')));assert.throws(()=>validateManifest(manifest,'https://evil.test/'));});
for(const [name,patch]of [['traversal',{relativePath:'../a.pdf'}],['missing hash',{sha256:''}],['unverified pages',{pageCount:0}],['invalid language',{language:'English'}]])test('1.2 manifest rejects '+name,()=>{const m=structuredClone(manifest);Object.assign(m.entries[0],patch);assert.throws(()=>validateManifest(m,base));});
test('1.2 manifest stable IDs survive path-only reorganizations and duplicate IDs are rejected',()=>{const m=structuredClone(manifest);m.entries[0].relativePath='library/new-location/spark.pdf';assert(validateManifest(m,base));assert.equal(m.entries[0].id,manifest.entries[0].id);m.entries[1].id=m.entries[0].id;assert.throws(()=>validateManifest(m,base));});
test('1.2 generated catalog is metadata only, canonical hierarchy, exact external hashes',()=>{const p=built.packs.find(p=>p.manifest.id==='pdfatlas.public');assert.equal(p.pages.length,2);assert.equal(p.documents.length,2);assert.deepEqual(p.assetKeys,[]);assert.deepEqual(p.manifest.assets,[]);assert.equal(p.projects[0].nodes[0].children[0].children.length,2);assert(!built.assets.some(a=>a.key.startsWith('pdfatlas.public')));for(const d of p.documents){const e=manifest.entries.find(e=>e.id===d.id);assert.equal(d.sha256,e.sha256);assert.equal(d.pageCount,e.pageCount);assert.equal(d.source.url,base+e.relativePath);assert(isTrustedPdfatlasDocument(d));}});
test('1.2 metadata-only references need explicit publication opt-in, never relabel rights',async()=>{await readWorkspace(files,schemas,{publicOnly:true,reviewed:review});const noOpt=structuredClone(review);delete noOpt['pdfatlas.public'].metadataOnlyReferences;await assert.rejects(readWorkspace(files,schemas,{publicOnly:true,reviewed:noOpt}),/Unreviewed PDF/);assert(built.packs.find(p=>p.manifest.id==='pdfatlas.public').documents.every(d=>d.rights.status==='reference-only'));});
test('1.2 reference-only binary documents remain blocked from public publication',async()=>{const input=new Map(files),key='packs/atlas.reader-guide/atlas-documents.json',index=JSON.parse(new TextDecoder().decode(input.get(key)));index.documents[0].rights.status='reference-only';input.set(key,new TextEncoder().encode(JSON.stringify(index)));const opt=structuredClone(review);opt['atlas.reader-guide'].metadataOnlyReferences=true;await assert.rejects(readWorkspace(input,schemas,{publicOnly:true,reviewed:opt}),/Unreviewed PDF/);});
test('1.2 external metadata does not prevent an explicit private offline PDF intake',async()=>{
 const {prepareLocalPdf,emptyPdfMetadata}=await import('../dist/app/core/pdf-library.js');
 const raw=new Uint8Array([...await fs.readFile('content/packs/atlas.reader-guide/assets/atlas-reader-fixture.pdf'),...new TextEncoder().encode('\n% explicit-private-copy\n')]);
 const hash=createHash('sha256').update(raw).digest('hex'),ws=blankWorkspace(),c=compose(built,ws);
 c.documents.push({...doc,id:'doc.external.reference',pageId:'page.external.reference',sha256:hash,bytes:raw.length});
 const out=await prepareLocalPdf(c,ws,raw,{...emptyPdfMetadata(),title:'My explicit local copy'},c.projects[0].id);
 assert(!out.duplicate);assert.equal(out.document.visibility,'private');assert.deepEqual(out.asset.bytes,raw);assert.equal(out.document.sha256,hash);assert.notEqual(out.document.id,'doc.external.reference');
});
test('1.2 importing local bytes is not blocked by a metadata-only remote SHA reference',async()=>{
 const {duplicatePdfImports}=await import('../dist/app/core/pdf-library.js');
 const c={documents:[{...doc,title:'Remote reference'}]},local={...doc,id:'local.copy',pageId:'local.copy.page',assetKey:'local/test.pdf',title:'Local copy'};
 assert.deepEqual(duplicatePdfImports(c,[{documents:[local]}]),[]);
 assert.equal(duplicatePdfImports({documents:[local]},[{documents:[{...local,id:'other',pageId:'other.page'}]}]).length,1);
});
