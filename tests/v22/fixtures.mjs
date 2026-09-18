import fs from 'node:fs/promises';
import {blankWorkspace,compose} from '../../dist-offline/app/core/workspace.js';
import {prepareWorkspaceHistory,assertProjection} from '../../dist-offline/app/history/engine.js';
import {validateHistory} from '../../dist-offline/app/history/validation.mjs';
import {createAgentInterface} from '../../dist-offline/app/agent/service.js';
import {validatePersonal} from '../../dist-offline/app/storage/personal-validation.mjs';
import {stable} from '../../dist-offline/app/core/validation.mjs';
export const built=JSON.parse(await fs.readFile('dist-offline/content.json','utf8'));
export const basePage=(id,title)=>({id,title,summary:'V2.2 synthetic test content.',blocks:[{id:id+'.body',type:'markdown',text:'Original explanation.'}],related:[],terms:[],sources:[],tags:[]});
export function authoredFixtures(){const ws=blankWorkspace();const a={...basePage('page.v22.article','Review article'),kind:'article',article:{id:'page.v22.article',title:'Review article',addedAt:1,taxonomy:{subject:'it'}}};const q={...basePage('page.v22.qcm','Review QCM'),kind:'qcm',blocks:[],qcm:{schemaVersion:1,id:'page.v22.qcm',title:'Review QCM',taxonomy:{subject:'it'},questions:[{id:'question.v22.one',prompt:'Select the safe writes.',options:[{id:'option.v22.a',text:'Preview'},{id:'option.v22.b',text:'Reviewed commit'},{id:'option.v22.c',text:'Erase history'}],correctOptionIds:['option.v22.a','option.v22.b'],explanation:'Preview does not persist; reviewed changes preserve history.'}]}};ws.overlays.pages[a.id]={page:a};ws.overlays.pages[q.id]={page:q};return ws;}
/** Unit-only backend for the public orchestrator. This is not IndexedDB/browser
 * evidence. Production atomicity is separately exercised by v22_runtime.py. */
export class MemoryBackend{
 constructor(state){this.state=state;this.saving=0;this.error='';this.commits=0;this.failNext=false;}
 async flush(){}
 async personal(fn){const next=structuredClone(this.state);fn(next.personal);validatePersonal(next.personal);this.state=next;this.commits++;}
 async reviewedMutation(fn,context){const before=this.state,next=structuredClone(before);fn(next);validatePersonal(next.personal);const ready=await prepareWorkspaceHistory(built,next,context);if(stable(before.history.reviews)!==stable(ready.history.reviews)&&before.history.meta.epoch===ready.history.meta.epoch)ready.history.meta.epoch++;if(context.changeSetId){const row=ready.history.reviews.find(r=>r.id===context.changeSetId);if(row?.status==='accepted')row.revisionIds=ready.history.revisions.filter(r=>r.changeSetId===context.changeSetId).map(r=>r.revisionId);}await validateHistory(ready.history);await assertProjection(compose(built,ready),ready);if(this.failNext){this.failNext=false;throw Error('Synthetic transaction failure before commit');}this.state=ready;this.commits++;}
 async manual(fn){const next=structuredClone(this.state);fn(next);this.state=await prepareWorkspaceHistory(built,next,{source:'manual',summary:'Manual fixture edit'});this.commits++;}
}
let n=0;
export async function setup(){const backend=new MemoryBackend(await prepareWorkspaceHistory(built,authoredFixtures(),{source:'migration',summary:'Synthetic baseline'}));return {backend,api:createAgentInterface(built,backend)};}
export function plan(operations,id='plan.v22.'+(++n)){return {schemaVersion:1,kind:'atlas-agent-changeset',id,createdAt:Date.now(),source:'Synthetic test agent',summary:'Reviewed fixture operations',operations};}
export function edit(api,key,mutate,kind='resource.update'){const r=api.getResource(key);mutate(r.snapshot);return {id:'operation.'+(++n),kind,resourceKey:key,baseRevisionId:r.head.revisionId,payload:{resourceType:r.resourceType,snapshot:r.snapshot}};}
export function personal(api,kind,payload){return {id:'operation.'+(++n),kind,baseFingerprint:api.getStateFingerprint(kind.startsWith('reference.')||kind.startsWith('concept.')?'semantic-reference':kind.startsWith('workspace.')?'workspace':'personal'),payload};}
export const assetResolver=async key=>{const meta=built.assets.find(a=>a.key===key);if(!meta)return;return {key,sha256:meta.sha256,mediaType:meta.mediaType,bytes:new Uint8Array(await fs.readFile('dist-offline/'+meta.path))};};
