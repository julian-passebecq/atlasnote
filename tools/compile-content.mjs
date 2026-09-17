import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readWorkspace,loadSchemas} from '../src/core/packs.mjs';
import {readFiles,writeJSON} from './fs.mjs';
import {sha256,stable} from '../src/core/validation.mjs';
export async function compileContent(out='dist',root='content'){
 const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
 const review=JSON.parse(await fs.readFile(path.join(root,'publication-review.json'),'utf8'));
 for(const [id,entry] of Object.entries(review.packs))if(!/^[a-f0-9]{64}$/.test(entry.sha256??''))throw Error('Publication review requires an explicit semantic SHA-256: '+id);
 const result=await readWorkspace(await readFiles(root),schemas,{publicOnly:true,reviewed:review.packs});
 if(out){const meta=[];for(const a of result.assets){const rel='content-assets/'+a.key;await fs.mkdir(path.dirname(path.join(out,rel)),{recursive:true});await fs.writeFile(path.join(out,rel),a.bytes);meta.push({key:a.key,path:rel,mediaType:a.mediaType,sha256:a.sha256});}
 await writeJSON(path.join(out,'content.json'),{releaseId:(await sha256(stable(result.packs.map(p=>p.hash)))).slice(0,16),packs:result.packs,groups:result.workspace.groups,assets:meta,validation:result.validation});}
 console.log('Validated public content:',JSON.stringify(result.validation));return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await compileContent(process.argv.includes('--check')?null:'dist');
