/** V3 reviewed `concept.create` operation (unit memory backend; not IndexedDB/browser evidence). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,plan,personal} from './v22/fixtures.mjs';
import {validateChangeSet} from '../dist-offline/app/agent/service.js';
import {operationRegistry,getAgentCapabilities} from '../dist-offline/app/agent/registry.js';
import {knowledgeOf} from '../dist-offline/app/references/knowledge.js';
const execute=async(api,ops)=>{const p=plan(ops);api.preview(p);await api.stage(p);await api.accept(p.id);return p;};
const K={notebook:'notebook-page:page.atlas.welcome'};

test('V3 concept.create is a registered, discoverable semantic-reference operation',()=>{
 assert.equal(operationRegistry['concept.create'].stateClass,'semantic-reference');
 assert.equal(Object.keys(operationRegistry).length,26);
 assert(getAgentCapabilities().actions.some(a=>a.kind==='concept.create'||a==='concept.create'||a.id==='concept.create'));
});
test('V3 concept.create creates a Concept Index concept and links it to an exact target only on explicit accept',async()=>{
 const {api,backend}=await setup(),target=api.getResource(K.notebook).target,before=knowledgeOf(backend.state.personal);
 const op=personal(api,'concept.create',{id:'concept.norsk.vocab.bok-noun',subject:'norsk',label:'bok',aliases:['bøker','book'],parentId:'concept.norsk',assignTo:target,note:'Norsk Daily vocabulary'});
 const p=plan([op]);api.preview(p);await api.stage(p);
 assert(!knowledgeOf(backend.state.personal).concepts.some(c=>c.id===op.payload.id),'preview/stage never create the concept');
 await api.accept(p.id);
 const k=knowledgeOf(backend.state.personal),concept=k.concepts.find(c=>c.id==='concept.norsk.vocab.bok-noun');
 assert(concept);assert.equal(concept.subject,'norsk');assert.equal(concept.primaryParentId,'concept.norsk');assert.deepEqual(concept.aliases,['bøker','book']);
 assert.equal(k.assignments.filter(a=>a.conceptId===concept.id).length,1,'linked to the exact target');
 assert(k.revision>before.revision);
});
test('V3 concept.create is idempotent for the same concept and refuses a conflicting one without changes',async()=>{
 const {api,backend}=await setup(),target=api.getResource(K.notebook).target;
 const payload={id:'concept.norsk.vocab.host-noun',subject:'norsk',label:'høst',aliases:['autumn']};
 await execute(api,[personal(api,'concept.create',payload)]);
 const count=()=>knowledgeOf(backend.state.personal).concepts.filter(c=>c.id===payload.id).length;
 await execute(api,[personal(api,'concept.create',{...payload,assignTo:target})]);
 assert.equal(count(),1,'reused, not duplicated');
 assert.equal(knowledgeOf(backend.state.personal).assignments.filter(a=>a.conceptId===payload.id).length,1,'a later batch can still link the existing concept');
 const snapshot=JSON.stringify(knowledgeOf(backend.state.personal));
 await assert.rejects(execute(api,[personal(api,'concept.create',{...payload,label:'vinter'})]),/already exists with a different label or subject/);
 assert.equal(JSON.stringify(knowledgeOf(backend.state.personal)),snapshot,'nothing changed');
});
test('V3 concept.create validation: canonical subject, bounded aliases, existing parent, no extra fields',async()=>{
 const {api}=await setup(),base={id:'concept.x.y',subject:'norsk',label:'x'};
 const bad=payload=>validateChangeSet(plan([personal(api,'concept.create',payload)]));
 assert.throws(()=>bad({...base,subject:'informatics'}),/canonical/);
 assert.throws(()=>bad({...base,aliases:Array.from({length:31},(_,i)=>'a'+i)}),/aliases/);
 assert.throws(()=>bad({...base,label:'   '}),/label/);
 assert.throws(()=>bad({...base,extra:true}),/./);
 await assert.rejects(execute(api,[personal(api,'concept.create',{...base,parentId:'concept.does-not-exist'})]),/Parent concept/);
});
