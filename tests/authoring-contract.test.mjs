import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseCheatsheetSource} from '../src/cheatsheets/content.mjs';
import {renderCheatsheetPage} from '../src/cheatsheets/renderer.mjs';
import {parseCSV,csvWorkspace} from '../src/content/csv.mjs';
import {validateArticleSource} from '../src/content-hub/validation.mjs';
import {articlePage} from '../dist-offline/app/content-hub/content.js';
const read=name=>fs.readFile(new URL('../examples/authoring/'+name,import.meta.url),'utf8');

test('authoring SQL native source renders every page across all five palettes',async()=>{
 const doc=parseCheatsheetSource(await read('sql-study.cheatsheet.json'));
 assert.equal(doc.schemaVersion,'1.1');assert.deepEqual(doc.pageSize,{width:1200,height:1600});
 for(const theme of ['source','black','slate','paper','warm'])for(let n=1;n<=doc.pages.length;n++){
  const out=renderCheatsheetPage(doc,n,{scope:`contract-${theme}-${n}`,sheetTheme:theme});
  assert.deepEqual(out.diagnostics,[],`${theme} page ${n}`);assert.match(out.svg,/ROW_NUMBER|GROUP BY|NOT EXISTS/);
 }
 const bad=structuredClone(doc);bad.pages[0].blocks[0].svg='<svg/>';
 assert.throws(()=>parseCheatsheetSource(JSON.stringify(bad)));
});

test('Norsk authoring input preserves Unicode, punctuation and genuinely blank relations',async()=>{
 const csv=await read('norsk-source.import.csv'),parsed=parseCSV(csv);
 assert.deepEqual(parsed.rows[0],['å gå','go, walk','VERB','A2','Travel','Synthetic QA','','']);
 assert.equal(parsed.rows[3][0],'Han sier "hei".');
 assert(parsed.rows.every(r=>r[6]===''&&r[7]===''));
 const files=csvWorkspace({id:'authoring.contract',title:'Synthetic authoring QA'},[{id:'source',title:'Fixture',csv}]);
 const pages=[...files].filter(([p])=>p.includes('/pages/')).map(([,b])=>JSON.parse(new TextDecoder().decode(b)));
 assert.deepEqual(pages.flatMap(p=>p.blocks[0].rows),parsed.rows);
});

test('Article authoring input keeps canonical identity and rejects wrapper/both-body/unsafe forms',async()=>{
 const source=JSON.parse(await read('article-blocks.import.json'));validateArticleSource(source);
 const page=articlePage(source);assert.equal(page.id,source.id);assert.equal(page.article.id,source.id);assert.deepEqual(page.blocks,source.blocks);
 for(const bad of [{...source,text:'second body'},{...source,kind:'article'},{...source,blocks:[{id:'bad-image',type:'image',src:'https://example.invalid/a.png'}]}])assert.throws(()=>validateArticleSource(bad));
});
