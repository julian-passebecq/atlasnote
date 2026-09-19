/** Synthetic unit fixtures. MemoryBackend is NOT browser/IndexedDB evidence. */
import fs from 'node:fs/promises';
import {built,MemoryBackend,assetResolver} from '../v22/fixtures.mjs';
import {blankWorkspace,compose} from '../../dist-offline/app/core/workspace.js';
import {prepareWorkspaceHistory} from '../../dist-offline/app/history/engine.js';
import {store} from '../../dist-offline/app/storage/database.js';
import {loadDurabilityDemo,durabilityDemoDefinition,DEMO_PREFIX} from '../../dist-offline/app/durability/demo.js';
import {loadSchemas} from '../../dist-offline/app/core/packs.mjs';
export {built,assetResolver,compose,MemoryBackend,DEMO_PREFIX,durabilityDemoDefinition};
export const schemas=await loadSchemas(name=>fs.readFile('src/content/schemas/'+name,'utf8'));
export const provenance=JSON.parse(await fs.readFile('dist-offline/build-identity.json','utf8'));
export async function withDemoBackend(fn){
 const backend=new MemoryBackend(await prepareWorkspaceHistory(built,blankWorkspace(),{source:'migration',summary:'Synthetic clean workspace'}));
 const original={state:store.state,reviewedMutation:store.reviewedMutation,error:store.error};
 store.setLoaded(backend.state);store.error='';
 store.reviewedMutation=async(change,context)=>{await backend.reviewedMutation(change,context);store.setLoaded(backend.state);};
 try{return await fn({backend,store,load:()=>loadDurabilityDemo(built)});}finally{store.reviewedMutation=original.reviewedMutation;store.setLoaded(original.state);store.error=original.error;}
}
export async function demoWorkspace(){return withDemoBackend(async({backend,load})=>{await load();return structuredClone(backend.state);});}
export const resolveFor=ws=>async key=>ws.assets.find(a=>a.key===key)??await assetResolver(key);
