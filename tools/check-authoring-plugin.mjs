/** Read-only alignment check against an explicitly supplied installed plugin/archive root. */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {parseCSV} from '../src/content/csv.mjs';
import {validateCheatsheet} from '../src/cheatsheets/validation.mjs';
import {renderCheatsheetPage} from '../src/cheatsheets/renderer.mjs';
import {validateArticleSource} from '../src/content-hub/validation.mjs';
const pluginRoot=process.argv[2];
if(!pluginRoot)throw Error('Usage: node tools/check-authoring-plugin.mjs <installed-plugin-root>');
const checks=[],hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const file=p=>fs.readFile(path.resolve(pluginRoot,p));
const native=[
 'src/cheatsheets/assets.mjs','src/cheatsheets/font-metrics.mjs','src/cheatsheets/model.ts',
 'src/cheatsheets/renderer.mjs','src/cheatsheets/text-layout.mjs','src/cheatsheets/validation.mjs',
 'src/core/appearance.mjs','src/content/schemas/cheatsheet-v1.schema.json'];
for(const p of native){
 const snapshot=await file('skills/atlas-cheatsheet-authoring/references/'+p),local=await fs.readFile(p);
 assert.equal(hash(snapshot),hash(local),'Plugin native snapshot diverged: '+p);
 checks.push({name:p,sha256:hash(local),status:'PASS'});
}
for(const kind of ['atlas-article-authoring','atlas-norsk-authoring']){
 const snapshot=await file(`skills/${kind}/references/atlas/page-v2.schema.json`),local=await fs.readFile('src/content/schemas/page-v2.schema.json');
 assert.equal(hash(snapshot),hash(local),kind+' Page V2 schema diverged');checks.push({name:kind+' Page V2 schema',status:'PASS'});
}
const {parseCSV:pluginCSV}=await import(pathToFileURL(path.resolve(pluginRoot,'skills/atlas-norsk-authoring/scripts/csv_parser_snapshot.mjs')).href);
for(const csv of ['Norsk,English,Synonyms,Antonyms\n"å gå","go, walk",,\n','sep=;\nNorsk;English\nøvelse;exercise','Norsk\tEnglish\nærlig\thonest','Norsk,English\n"Han sier ""hei"".","He says hello.\nAgain."'])assert.deepEqual(pluginCSV(csv),parseCSV(csv));
for(const csv of ['A,B\nx','A,B\n"unclosed,y','A,B\n"x"bad,y']){assert.throws(()=>pluginCSV(csv));assert.throws(()=>parseCSV(csv));}
checks.push({name:'CSV Unicode/quoted/multiline/blank and malformed behavioral parity',status:'PASS'});
const doc=JSON.parse(await file('examples/synthetic-png-conversion.cheatsheet.json'));validateCheatsheet(doc);
for(let n=1;n<=doc.pages.length;n++)for(const sheetTheme of ['source','black','slate','paper','warm'])assert.deepEqual(renderCheatsheetPage(doc,n,{scope:`plugin-${n}-${sheetTheme}`,sheetTheme}).diagnostics,[]);
checks.push({name:'Installed cheatsheet example validates and renders in all five local palettes',status:'PASS'});
const article=JSON.parse(await file('examples/article-example.import.json'));validateArticleSource(article);checks.push({name:'Installed ArticleSource example matches native local validator',status:'PASS'});
const vocabulary=new TextDecoder('utf-8',{fatal:true}).decode(await file('examples/norsk-vocabulary.import.csv'));assert.deepEqual(pluginCSV(vocabulary),parseCSV(vocabulary));checks.push({name:'Installed Norsk CSV example matches native local parser',status:'PASS'});
console.log(JSON.stringify({status:'PASS',scope:'Installed files and actual local native code; no plugin publication or remote app proof',pluginRoot:path.resolve(pluginRoot),checks},null,2));
