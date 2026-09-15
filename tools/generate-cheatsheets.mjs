import fs from 'node:fs/promises';
import path from 'node:path';
import {cheatsheetPage} from '../src/cheatsheets/content.mjs';
import {renderCheatsheetPage} from '../src/cheatsheets/renderer.mjs';
import {sha256,stable} from '../src/core/validation.mjs';
const ids=['sql-analytics','pyspark-execution','azure-data-factory','pandas-essentials'];
const related={
 'sql-analytics':['page.interview.sql-q1','page.interview.sql-q2','page.interview.sql-q3','page.interview.sql-q4','page.interview.sql-q5'],
 'pyspark-execution':['page.interview.hybrid-lazy','page.interview.theory-layout'],
 'azure-data-factory':['page.interview.hybrid-retry','page.interview.theory-medallion'],
 'pandas-essentials':['page.interview.coding-group','page.interview.hybrid-fanout']
};
const documents=await Promise.all(ids.map(async id=>JSON.parse(await fs.readFile('content/cheatsheets/'+id+'.json','utf8'))));
const pages=documents.map(d=>cheatsheetPage(d,{related:related[d.id]}));
const manifest={format:'atlas-content-pack',schemaVersion:1,payloadSchema:'atlas.bundle@2',id:'atlas.cheatsheet-samples',version:'1.0.0',title:'Cheatsheets',visibility:'public',files:{projects:'projects.json',pages:'pages',glossary:'glossary.json'},requires:[{id:'atlas.interview-samples',version:'1.0.0'}],assets:[],provenance:{kind:'author-created',note:'Structured reconstructions of user-supplied TEST_PACK and previews. ADF page 1 is explicitly reconstructed from the outline; original grammar JSON was absent. No private library, third-party fonts or embedded preview images.'}};
const projects=[{id:'project.cheatsheets',title:'Cheatsheets',icon:'grid',description:'Four native, fixed-page SVG references. JSON is the source; diagrams and text remain editable data.',nodes:pages.map(p=>({id:'node.cheatsheet.'+p.cheatsheet.id,title:p.title,pageId:p.id}))}];
const files=new Map([['atlas-pack.json',manifest],['projects.json',projects],['glossary.json',[]],...pages.map(p=>['pages/'+p.id+'.json',p])]);
const check=process.argv.includes('--check'),root='content/packs/atlas.cheatsheet-samples';
for(const d of documents)for(let n=1;n<=d.pages.length;n++){const result=renderCheatsheetPage(d,n);if(result.diagnostics.length)throw Error(d.id+' page '+n+': '+JSON.stringify(result.diagnostics));}
for(const [name,value] of files){const dest=path.join(root,name),text=JSON.stringify(value,null,2)+'\n';if(check){if(await fs.readFile(dest,'utf8')!==text)throw Error('Stale generated cheatsheet: '+dest);}else{await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,text);}}
if((await fs.readdir(path.join(root,'pages'))).some(p=>!files.has('pages/'+p)))throw Error('Unexpected generated cheatsheet page');
// readWorkspace sorts physical files when constructing the semantic pack hash.
const hash=await sha256(stable({manifest,projects,pages:[...pages].sort((a,b)=>a.id.localeCompare(b.id)),glossary:[],documents:[]}));
const reviewFile='content/publication-review.json',review=JSON.parse(await fs.readFile(reviewFile,'utf8'));
if(check){if(review.packs[manifest.id]?.sha256!==hash)throw Error('Stale cheatsheet publication review.');}
else{review.packs[manifest.id]={review:'User-supplied reference previews reconstructed as canonical JSON. Reference terminology retained; this is renderer acceptance content, not independently vendor-verified guidance. ADF page 1 reconstruction is disclosed in its metadata and page caption.',sha256:hash};await fs.writeFile(reviewFile,JSON.stringify(review,null,2)+'\n');}
console.log(`${check?'Verified':'Generated'} ${documents.length} native cheatsheets / ${documents.reduce((n,d)=>n+d.pages.length,0)} physical pages; semantic hash ${hash}`);
