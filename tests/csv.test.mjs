import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseCSV,csvWorkspace} from '../src/content/csv.mjs';
import {loadSchemas,readWorkspace} from '../src/core/packs.mjs';
test('CSV preserves Norwegian Unicode, quoted commas, quotes, embedded lines and empty final cells',()=>{
 assert.deepEqual(parseCSV('\uFEFFNorsk,English,Example\r\n"å gå","go, walk","Han sier ""hei"".\nSå går han."\r\nfår,gets,\r\n'),{columns:['Norsk','English','Example'],rows:[['å gå','go, walk','Han sier "hei".\nSå går han.'],['får','gets','']]});
 assert.deepEqual(parseCSV('sep=;\nNorsk;English\nbåt;boat').rows,[['båt','boat']]);
 assert.deepEqual(parseCSV('Norsk\tEnglish\nbåt\tboat').rows,[['båt','boat']]);
});
test('CSV rejects broken records instead of dropping or shifting translations',()=>{
 for(const csv of ['A,B\nx','A,B\nx,y,z','A,B\n"x,y','A,B\n"x"bad,y','A,B\nx"y,z','A,B'])assert.throws(()=>parseCSV(csv));
 assert.throws(()=>parseCSV('A\n'+'x'.repeat(2_000_001)),/2 MB/);
 assert.throws(()=>parseCSV(Array(33).fill('a').join(',')+'\n'+Array(33).fill('b').join(',')),/32 columns/);
});
test('CSV conversion validates canonical source, splits without row loss and preserves stable IDs',async()=>{
 const csv='Norsk,English\n'+Array.from({length:81},(_,i)=>'ord'+i+',word'+i).join('\n'),spec={id:'test.csv',title:'Norsk'};
 const files=csvWorkspace(spec,[{id:'one',title:'Words',folder:'A2/Vocabulary',csv}]);
 const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8')),result=await readWorkspace(files,schemas),pages=result.packs[0].pages;
 assert.equal(pages.length,3);assert.deepEqual(pages.flatMap(p=>p.blocks[0].rows),parseCSV(csv).rows);
 assert.equal(result.packs[0].manifest.visibility,'private');assert(pages.every(p=>p.tags.includes('csv-table')));
 const revised=await readWorkspace(csvWorkspace({...spec,version:'1.0.1'},[{id:'one',title:'Words',folder:'A2/Vocabulary',csv:csv.replace('word1\n','revised\n')}]),schemas);
 assert.deepEqual(revised.packs[0].pages.map(p=>p.id),pages.map(p=>p.id));
});
test('The ten reviewed source sheets reproduce their complete selected lexical rows',async()=>{
 const spec=JSON.parse(await fs.readFile('content/norsk-csv/index.json','utf8'));
 assert.equal(spec.sheets.length,10);
 for(const sheet of spec.sheets){const parsed=parseCSV(await fs.readFile('content/norsk-csv/'+sheet.file,'utf8'));assert.equal(parsed.rows.length,sheet.rows,sheet.id);assert.equal(parsed.columns[0],'Norsk');assert.equal(parsed.columns[1],'English');assert(parsed.rows.every(row=>row[0]&&row[1]));}
});
