import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {compileContent} from './compile-content.mjs';import {readFiles} from './fs.mjs';
const root=process.argv[2]||'dist',result=await compileContent(null),built=JSON.parse(await fs.readFile(root+'/content.json','utf8'));
assert.deepEqual(built.packs.map(p=>p.hash),result.packs.map(p=>p.hash),'distribution must match the reviewed source');assert(built.packs.every(p=>p.manifest.visibility==='public'));
const files=await readFiles(root),integrated=files.has('pdf-assets/engine.json');let fontAllowlist=new Set();
if(integrated){
 const meta=JSON.parse(new TextDecoder().decode(files.get('pdf-assets/engine.json')));assert.equal(meta.reactPdf,'10.5.0');assert.equal(meta.pdfjs,'5.4.296');
 const inventory=JSON.parse(new TextDecoder().decode(files.get('pdf-assets/integrity.json')));assert.equal(inventory.pdfjs,meta.pdfjs);
 for(const [rel,expected] of Object.entries(inventory.files)){assert(!rel.includes('..')&&!rel.startsWith('/'),'Invalid PDF asset path');const data=files.get('pdf-assets/'+rel);assert(data,'Missing PDF engine asset '+rel);assert.equal(createHash('sha256').update(data).digest('hex'),expected,'Changed PDF engine asset '+rel);}
 for(const part of ['pdf.worker.min.mjs','cmaps/','wasm/','standard_fonts/'])assert(Object.keys(inventory.files).some(p=>p===part||p.startsWith(part)),'Missing PDF support assets '+part);
 fontAllowlist=new Set(Object.keys(inventory.files).filter(p=>p.startsWith('standard_fonts/')&&!p.includes('..')).map(p=>'pdf-assets/'+p));
 assert(files.has('app/storage/workspace-snapshot.js'),'Hosted read-only snapshot API is required for exact runtime gates');
 const html=new TextDecoder().decode(files.get('index.html'));assert(/type="module"[^>]*src="[^\"]*assets\//.test(html),'Integrated entry must be Vite output');assert(!html.includes('src="./app/main.js"'),'Hosted output must not be offline entry');
}else{assert.equal(root,'dist-offline','Production dist must be the integrated build, not the compatibility renderer');assert(files.has('app/main.js'));}
const bad=[...files.keys()].filter(p=>/(?:^|\/)(?:node_modules|private-library|LOCAL_PRIVATE_COMPLETE)(?:\/|$)|\.(?:ipynb|deepnote)$|\.private\.zip$/i.test(p)||(/\.(?:woff2?|ttf|otf)$/i.test(p)&&!fontAllowlist.has(p)));
assert.deepEqual(bad,[],'Private/raw files and unverified fonts are forbidden');assert(files.has('index.html'));assert(files.has('serve.mjs'));
console.log(JSON.stringify({status:'PASS',scope:integrated?'Integrated public build, reviewed content, pinned worker/support asset integrity, private/raw exclusion':'Compatibility public build only; not hosted release certification',root,publicPages:result.validation.pages,publicTerms:result.validation.terms,publicProjects:result.validation.projects,files:files.size},null,2));
