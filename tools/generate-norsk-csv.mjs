import fs from 'node:fs/promises';
import path from 'node:path';
import {csvWorkspace} from '../src/content/csv.mjs';
import {loadSchemas,readWorkspace} from '../src/core/packs.mjs';
const spec=JSON.parse(await fs.readFile('content/norsk-csv/index.json','utf8'));
spec.visibility='public';spec.provenance='User-created study sheets selected from supplied workbooks. Public lexical translations and inflections authorized by the owner on 2026-10-05. Textbook passages, definitions, exam examples and private full translations are excluded. Source linguistic quality is retained, not independently verified.';
const sheets=await Promise.all(spec.sheets.map(async s=>({...s,csv:await fs.readFile(path.join('content/norsk-csv',s.file),'utf8')}))),files=csvWorkspace(spec,sheets),schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8')),result=await readWorkspace(files,schemas),check=process.argv.includes('--check');
for(const [name,bytes] of files){if(name==='workspace.json')continue;const target=path.join('content',name);if(check){const actual=await fs.readFile(target);if(!actual.equals(Buffer.from(bytes)))throw Error('CSV generated source is stale: '+name);}else {await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}}
console.log(JSON.stringify({pages:result.validation.pages,rows:sheets.reduce((n,s)=>n+s.rows,0),sha256:result.packs[0].hash}));
