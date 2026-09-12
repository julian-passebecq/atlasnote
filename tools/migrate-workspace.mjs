import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {readFiles,writeJSON} from './fs.mjs';import {loadSchemas,readWorkspace} from '../src/core/packs.mjs';
export async function migrateWorkspace(input,output){const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8')),files=await readFiles(input),result=await readWorkspace(files,schemas);await fs.mkdir(output,{recursive:true});
 await writeJSON(path.join(output,'workspace.json'),result.workspace);
 for(const p of result.packs){const dir=path.join(output,result.workspace.packsDirectory,p.manifest.id);await writeJSON(path.join(dir,'atlas-pack.json'),p.manifest);await writeJSON(path.join(dir,p.manifest.files.projects),p.projects);await writeJSON(path.join(dir,p.manifest.files.glossary),p.glossary);
 for(const page of p.pages)await writeJSON(path.join(dir,p.manifest.files.pages,page.id+'.json'),page);await writeJSON(path.join(dir,'block-migration.json'),{schemaVersion:1,algorithm:'sha256(pageId + NUL + sourcePointer + NUL + collisionSalt)',assignments:p.migration});
 for(const key of p.assetKeys){const a=result.assets.find(x=>x.key===key),rel=key.slice((p.manifest.id+'@'+p.manifest.version+'/').length);await fs.mkdir(path.dirname(path.join(dir,rel)),{recursive:true});await fs.writeFile(path.join(dir,rel),a.bytes);}
 const original=[...files.keys()].find(f=>f.endsWith('/atlas-documents.json')&&new TextDecoder().decode(files.get(f)).includes('"'+p.manifest.id+'"'));if(original)await fs.writeFile(path.join(dir,'atlas-documents.json'),files.get(original));
 }
 return await readWorkspace(await readFiles(output),schemas);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const[, ,input,output]=process.argv;if(!input||!output)throw Error('Usage: node tools/migrate-workspace.mjs INPUT NEW_OUTPUT');try{await fs.access(output);throw Error('Output already exists; refusing to overwrite');}catch(e){if(e.code!=='ENOENT')throw e;}const r=await migrateWorkspace(input,output);console.log(r.validation);}
