import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {csvWorkspace} from '../src/content/csv.mjs';
import {loadSchemas,readWorkspace} from '../src/core/packs.mjs';
export async function convertCSVIndex(indexPath,output){
 const spec=JSON.parse(await fs.readFile(indexPath,'utf8')),base=path.dirname(indexPath),sheets=await Promise.all(spec.sheets.map(async s=>{const file=path.resolve(base,s.file);if(!file.startsWith(path.resolve(base)+path.sep))throw Error('CSV path escapes source directory');return {...s,csv:await fs.readFile(file,'utf8')};}));
 const files=csvWorkspace(spec,sheets),schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8')),result=await readWorkspace(files,schemas);
 for(const [name,bytes] of files){const target=path.join(output,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node tools/csv-to-atlas.mjs <index.json> <workspace-directory>');
 const result=await convertCSVIndex(input,output);console.log(JSON.stringify({pages:result.validation.pages,packs:result.packs.map(p=>({id:p.manifest.id,sha256:p.hash}))}));
}
