import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {setup,built,basePage,plan,edit,personal} from './v22/fixtures.mjs';
import {stable} from '../src/core/validation.mjs';
import {validateChangeSet,StaleChangeSetError} from '../dist-offline/app/agent/service.js';
import {operationRegistry} from '../dist-offline/app/agent/registry.js';
import {WorkspaceStore} from '../dist-offline/app/storage/database.js';
import {resourceAdapters} from '../dist-offline/app/history/adapters.js';
import {compose,findNode,current} from '../dist-offline/app/core/workspace.js';
import {activeSession} from '../dist-offline/app/core/workspace-slots.js';
import {knowledgeOf} from '../dist-offline/app/references/knowledge.js';
import {checkCriticalManifest,checkPdfatlasProvenance} from '../tools/check-pdfatlas-provenance.mjs';
const K={notebook:'notebook-page:page.atlas.welcome',article:'article:page.v22.article',qcm:'qcm:page.v22.qcm',sheet:'cheatsheet:page.cheatsheet.azure-data-factory',tree:'notebook-tree:project.atlas.guide',pdf:'pdf:doc.atlas.pdf'};
const change=(api,key=K.notebook)=>edit(api,key,s=>s.page.blocks.push({id:s.page.id+'.agent',type:'markdown',text:'Reviewed explanation.'}));
const authored=ws=>stable({overlays:ws.overlays,heads:ws.history.heads,revisions:ws.history.revisions});
const execute=async(api,ops)=>{const p=plan(ops);api.preview(p);await api.stage(p);await api.accept(p.id);return p;};
const op=(api,key,kind,payload)=>({id:'operation.'+kind,kind,resourceKey:key,baseRevisionId:api.getResource(key).head.revisionId,payload});

test('V22 public query discovery is bounded, clone-safe, private-opt-in and pure',async()=>{
 const {api,backend}=await setup(),before=stable(backend.state),manifest=api.getAgentCapabilities();
 assert.equal(manifest.release,'2.2.0');assert.deepEqual(new Set(manifest.actions.map(a=>a.kind)),new Set(Object.keys(operationRegistry)));
 for(const action of manifest.actions){assert(action.atomic&&action.reviewRequired);assert(action.payloadSchema.required.length);assert(action.resultingStateClass);}
 for(const type of ['notebook-page','article','cheatsheet','qcm','pdf']){const r=api.listResources({type,limit:1});assert.equal(r.items.length,1);assert.equal(r.items[0].resourceType,type);}
 assert(api.listResources({type:'notebook-tree',includeStructures:true}).items.length);
 assert.equal(api.getWorkspaceSummary().slots.length,5);assert(api.getStorageDiagnostics());
 const context=api.getAgentContext({resourceKeys:[K.notebook],includeHistory:true});assert(!context.personal);assert(context.untrustedContent);
 assert(api.getAgentContext({includePersonal:true}).personal);context.resources[0].snapshot.page.title='Mutated external copy';
 assert.notEqual(api.getResource(K.notebook).snapshot.page.title,'Mutated external copy');assert.equal(stable(backend.state),before);assert.equal(backend.commits,0);
 for(const fn of [()=>api.listResources({limit:101}),()=>api.listResourceVersions(K.notebook,0,101),()=>api.getAgentContext({resourceKeys:Array(21).fill(K.notebook)}),()=>api.getReviews(-1),()=>api.getWorkspaceSummary(6)])assert.throws(fn);
});

test('V22 preview is read-only; stage writes only review metadata; reject retains audit',async()=>{
 const {api,backend}=await setup(),p=plan([change(api)]),before=stable(backend.state),content=authored(backend.state);
 assert(api.preview(p).changes.length);assert.equal(stable(backend.state),before);assert.equal(backend.commits,0);
 await api.stage(p);assert.equal(authored(backend.state),content);assert.equal(api.getReviews().items[0].status,'staged');
 await api.reject(p.id);assert.equal(authored(backend.state),content);assert.equal(api.getReviews().items[0].status,'rejected');await assert.rejects(api.accept(p.id));
});

test('V22 acceptance updates one head, preserves stable IDs and links exact AI audit',async()=>{
 const {api,backend}=await setup(),prior=api.getResource(K.notebook),p=await execute(api,[change(api)]),r=api.getResource(K.notebook);
 assert.equal(r.head.number,2);assert.equal(r.snapshot.page.id,prior.snapshot.page.id);assert.equal(r.snapshot.page.blocks[0].id,prior.snapshot.page.blocks[0].id);
 const rev=backend.state.history.revisions.find(r=>r.revisionId===api.getReviews().items[0].revisionIds[0]);assert.equal(rev.changeSetId,p.id);assert.equal(rev.source,'ai');
 assert.equal(rev.parentRevisionId,prior.head.revisionId);await assert.rejects(api.accept(p.id));await assert.rejects(api.stage(p));
});

test('V22 Article body and taxonomy use one canonical snapshot and one revision',async()=>{
 const {api}=await setup();const p=change(api,K.article),assign=op(api,K.article,'taxonomy.assign',{taxonomy:{subject:'cloud'}});await execute(api,[p,assign]);
 const r=api.getResource(K.article);assert.equal(r.head.number,2);assert.equal(r.snapshot.taxonomy.subject,'cloud');assert.equal(r.snapshot.page.article.taxonomy.subject,'cloud');
 assert(r.snapshot.page.blocks.some(b=>b.id==='page.v22.article.agent'));
});
for(const [key,modify]of [[K.sheet,s=>s.page.cheatsheet.pages[0].blocks[0].text+=' Reviewed'],[K.qcm,s=>s.page.qcm.questions[0].prompt+=' Explain.'],[K.pdf,s=>{s.document.title+=' Reviewed';s.page.title=s.document.title;}]])test('V22 accepted structured resource '+key,async()=>{
 const {api}=await setup(),before=api.getResource(key);await execute(api,[edit(api,key,modify)]);const after=api.getResource(key);assert.equal(after.head.number,2);assert.equal(after.resourceId,before.resourceId);
 if(key===K.qcm){assert.deepEqual(after.snapshot.page.qcm.questions[0].correctOptionIds,before.snapshot.page.qcm.questions[0].correctOptionIds);assert.equal(after.snapshot.page.qcm.questions[0].id,before.snapshot.page.qcm.questions[0].id);}
 if(key===K.pdf)assert.equal(after.snapshot.document.sha256,before.snapshot.document.sha256);
});

test('V22 selecting one operation does not apply or revise unselected resources',async()=>{
 const {api,backend}=await setup(),a=change(api),b=change(api,K.article),p=plan([a,b]);await api.stage(p);await api.accept(p.id,[a.id]);assert.equal(api.getResource(K.notebook).head.number,2);assert.equal(api.getResource(K.article).head.number,1);assert.deepEqual(api.getReviews().items[0].selectedOperationIds,[a.id]);assert.equal(api.getReviews().items[0].revisionIds.length,1);
});

test('V22 stale resource base refuses whole batch and records stale without partial edits',async()=>{
 const {api,backend}=await setup(),p=plan([change(api),change(api,K.article)]);await api.stage(p);await backend.manual(ws=>{const s=api.getResource(K.article).snapshot;s.page.blocks[0].text+=' Human edit';resourceAdapters.article.project(ws.overlays,compose(built,ws),s);});const before=authored(backend.state);
 await assert.rejects(api.accept(p.id),StaleChangeSetError);assert.equal(authored(backend.state),before);assert.equal(api.getReviews().items[0].status,'stale');await api.reject(p.id);assert.equal(api.getReviews().items[0].status,'rejected');
});

test('V22 queued validation rejection does not poison storage or prevent stale audit',async()=>{
 const {backend}=await setup(),store=new WorkspaceStore();store.setLoaded(backend.state);const before=stable(store.state);await assert.rejects(store.reviewedMutation(()=>{throw new StaleChangeSetError('Expected test stale base');},{source:'ai'}),StaleChangeSetError);await store.flush();assert.equal(store.error,'');assert.equal(store.saving,0);assert.equal(stable(store.state),before);
});

test('V22 injected unit transaction failure leaves content, review and heads unchanged',async()=>{
 const {api,backend}=await setup(),p=plan([change(api),change(api,K.article)]);await api.stage(p);const before=stable(backend.state);backend.failNext=true;await assert.rejects(api.accept(p.id),/transaction failure/);assert.equal(stable(backend.state),before);await api.accept(p.id);assert.equal(api.getResource(K.notebook).head.number,2);assert.equal(api.getResource(K.article).head.number,2);
});

test('V22 multiple restore-as-new operations append exact provenance atomically',async()=>{
 const {api,backend}=await setup(),a=api.getResource(K.notebook),b=api.getResource(K.article);await execute(api,[change(api),change(api,K.article)]);await execute(api,[op(api,K.notebook,'resource.restoreAsNewRevision',{revisionId:a.head.revisionId}),{...op(api,K.article,'resource.restoreAsNewRevision',{revisionId:b.head.revisionId}),id:'operation.restore.second'}]);
 for(const old of [a,b]){const r=api.getResource(old.resourceKey);assert.equal(r.head.number,3);assert.deepEqual(r.snapshot,old.snapshot);assert.equal(backend.state.history.revisions.find(x=>x.revisionId===r.head.revisionId).restoredFromRevisionId,old.head.revisionId);}
});

test('V22 draft acceptance is audit-only and cannot silently publish the draft',async()=>{
 const {api,backend}=await setup(),p=change(api);p.kind='resource.draft';const before=authored(backend.state);await execute(api,[p]);assert.equal(authored(backend.state),before);assert.equal(api.getReviews().items[0].status,'accepted');assert.deepEqual(api.getReviews().items[0].revisionIds,[]);
});

test('V22 create resource gets baseline v1; duplicate/type-changing IDs are rejected',async()=>{
 const {api}=await setup(),snapshot={page:basePage('page.v22.new','New agent note')};const operation={id:'create.new',kind:'resource.create',resourceKey:'notebook-page:page.v22.new',baseRevisionId:null,payload:{resourceType:'notebook-page',snapshot}};await execute(api,[operation]);assert.equal(api.getResource(operation.resourceKey).head.number,1);assert.throws(()=>api.preview(plan([operation])),/exists/);
 const original=api.getResource(K.article).snapshot.page;delete original.kind;delete original.article;assert.throws(()=>api.preview(plan([{...operation,resourceKey:'notebook-page:'+original.id,payload:{resourceType:'notebook-page',snapshot:{page:original}}}])),/identity|type/);
});

test('V22 Notebook create/rename/reorder/move use the shared structural service',async()=>{
 const {api,backend}=await setup(),key=K.tree,projectId=api.getResource(key).resourceId;const folder='node.v22.folder',leaf='node.v22.placement';
 await execute(api,[op(api,key,'notebook.tree.createNode',{operation:{kind:'add',projectId,nodeId:folder,node:{id:folder,title:'Folder',children:[]}}})]);
 await execute(api,[op(api,key,'notebook.tree.createNode',{operation:{kind:'add',projectId,nodeId:leaf,node:{id:leaf,title:'Reference',pageId:'page.atlas.welcome'}}})]);
 await execute(api,[op(api,key,'notebook.tree.renameNode',{operation:{kind:'rename',nodeId:leaf,title:'Renamed'}})]);
 await execute(api,[op(api,key,'notebook.tree.reorderNode',{operation:{kind:'order',nodeId:leaf,delta:-1}})]);
 await execute(api,[op(api,key,'notebook.tree.moveNode',{operation:{kind:'move',nodeId:leaf,projectId,parentId:folder}})]);
 const found=findNode(compose(built,backend.state).projects,leaf);assert.equal(found.node.title,'Renamed');assert.equal(found.ancestors.at(-1),folder);assert.equal(api.getResource(key).head.number,6);
});

test('V22 tree move into another Notebook requires both live heads',async()=>{
 const {api}=await setup(),tree=api.getResource(K.tree),target=api.listResources({type:'notebook-tree',includeStructures:true}).items.find(r=>r.resourceKey!==K.tree&&!r.resourceId.includes('manual'));
 const operation={kind:'move',nodeId:tree.snapshot.project.nodes[0].id,projectId:target.resourceId};const bad=op(api,K.tree,'notebook.tree.moveNode',{operation});assert.throws(()=>api.preview(plan([bad])),/destination/);
 const good={...bad,payload:{operation,destinationBaseRevisionId:target.head.revisionId}};await execute(api,[good]);assert.equal(api.getResource(K.tree).head.number,2);assert.equal(api.getResource(target.resourceKey).head.number,2);
});

test('V22 authored exact link add/update/remove is versioned rather than backlink storage',async()=>{
 const {api}=await setup(),target=api.getResource(K.article).target;await execute(api,[op(api,K.notebook,'resource.link.add',{label:'Read explanation',target})]);assert.equal(api.getResource(K.notebook).snapshot.page.resourceLinks.length,1);
 await execute(api,[op(api,K.notebook,'resource.link.update',{index:0,label:'Updated label',target})]);assert.equal(api.getResource(K.notebook).snapshot.page.resourceLinks[0].label,'Updated label');
 await execute(api,[op(api,K.notebook,'resource.link.remove',{index:0})]);assert.equal(api.getResource(K.notebook).snapshot.page.resourceLinks.length,0);assert.equal(api.getResource(K.notebook).head.number,4);
});

test('V22 semantic exact reference uses existing service and no authored revision',async()=>{
 const {api,backend}=await setup(),source=api.getResource(K.notebook).target,target=api.getResource(K.article).target,before=authored(backend.state);
 await execute(api,[personal(api,'reference.add',{source,target,sourceRevision:api.resolveTarget(source).revision,targetRevision:api.resolveTarget(target).revision,kind:'related',label:'Reviewed link'})]);
 assert.equal(authored(backend.state),before);const edge=knowledgeOf(backend.state.personal).edges.at(-1);assert(edge);await execute(api,[personal(api,'reference.remove',{id:edge.id})]);assert.equal(knowledgeOf(backend.state.personal).edges.length,0);
});

test('V22 semantic reference stale target content rejects even unchanged semantic fingerprint',async()=>{
 const {api}=await setup(),source=api.getResource(K.notebook).target,target=api.getResource(K.article).target;
 const p=plan([personal(api,'reference.add',{source,target,sourceRevision:api.resolveTarget(source).revision,targetRevision:api.resolveTarget(target).revision,kind:'related'})]);await api.stage(p);await execute(api,[change(api,K.article)]);await assert.rejects(api.accept(p.id),/Stale semantic/);
});

test('V22 reviewed bookmark, Read Later and captures preserve content and attempts',async()=>{
 const {api,backend}=await setup(),target=api.getResource(K.notebook,api.getResource(K.notebook).head.revisionId).target,before=authored(backend.state);
 await execute(api,[personal(api,'bookmark.add',{target,title:'Pinned revision'}),personal(api,'readLater.add',{target,title:'Later'}),personal(api,'capture.create',{kind:'note',text:'A reviewed capture',target})]);
 assert.equal(backend.state.personal.bookmarks.at(-1).target.historyRevisionId,target.historyRevisionId);assert.equal(authored(backend.state),before);assert.deepEqual(backend.state.personal.qcmAttempts??[],[]);
 const capture=backend.state.personal.dashboardItems.at(-1);await execute(api,[personal(api,'capture.update',{id:capture.id,text:'Updated capture',status:'done'}),personal(api,'bookmark.remove',{id:backend.state.personal.bookmarks.at(-1).id}),personal(api,'readLater.remove',{id:backend.state.personal.readLater.at(-1).id})]);
 assert.equal(backend.state.personal.dashboardItems.at(-1).status,'done');assert.equal(authored(backend.state),before);
});

test('V22 reviewed personal fingerprint rejects stale selected batch',async()=>{
 const {api,backend}=await setup(),p=plan([change(api),personal(api,'capture.create',{kind:'note',text:'Do not apply'})]);await api.stage(p);await execute(api,[personal(api,'capture.create',{kind:'note',text:'New user-visible capture'})]);const before=authored(backend.state);await assert.rejects(api.accept(p.id),/Stale personal/);assert.equal(authored(backend.state),before);assert.equal(backend.state.personal.dashboardItems.length,1);
});

test('V22 public navigation supports explicit physical PDF page, panes and all five workspaces',async()=>{
 const {api,backend}=await setup(),pdf=api.getResource(K.pdf),t={...pdf.target,pdfPage:2},before=authored(backend.state);await api.navigateAgentTarget(t,'here');const initial=structuredClone(activeSession(backend.state.personal).panes[0]);await api.navigateAgentTarget(api.getResource(K.article).target,'pane');assert.deepEqual(activeSession(backend.state.personal).panes[0],initial);
 for(let slot=1;slot<=5;slot++){await api.navigateAgentTarget(t,slot);assert.equal(backend.state.personal.activeWorkspaceSlot,slot);const s=activeSession(backend.state.personal),p=s.panes.find(p=>p.id===s.activePane);assert.equal(current(p.views.find(v=>v.id===p.active)).pdfPage,2);}
 for(const mode of ['changes','side-by-side','a','b']){await api.setAgentCompareState({enabled:true,mode,pane:'B'});assert.equal(activeSession(backend.state.personal).revisionCompareMode,mode);}await api.setAgentCompareState({enabled:false});assert.equal(activeSession(backend.state.personal).panes.length,1);assert.equal(authored(backend.state),before);
});

test('V22 reviewed layout operations use canonical navigation without content revisions',async()=>{
 const {api,backend}=await setup(),before=authored(backend.state);await execute(api,[personal(api,'workspace.navigate',{target:api.getResource(K.article).target,destination:5}),personal(api,'workspace.compare',{enabled:true,mode:'side-by-side',pane:'B'})]);assert.equal(backend.state.personal.activeWorkspaceSlot,5);assert.equal(activeSession(backend.state.personal).panes.length,2);assert.equal(authored(backend.state),before);
});

test('V22 PDF agent metadata cannot fetch bytes, change visibility or upgrade rights',async()=>{
 const {api}=await setup();for(const mutate of [s=>s.document.visibility=s.document.visibility==='public'?'private':'public',s=>s.document.rights.status='permission',s=>{s.document.sha256='a'.repeat(64);s.pdfProvenance.sha256=s.document.sha256;},s=>s.document.source={kind:'https',url:'https://example.invalid/unreviewed.pdf'}]){const e=edit(api,K.pdf,mutate,'pdf.metadata.update');assert.throws(()=>api.preview(plan([e])));}
 const e=edit(api,K.pdf,s=>s.companion.categories[0].title+=' Reviewed','pdf.metadata.update');await execute(api,[e]);assert.equal(api.getResource(K.pdf).head.number,2);
});

for(const kind of ['backup.restore','database.clear','history.erase','qcm.attempt.update','publish','remote.fetch','self-approve','resource.delete'])test('V22 forbidden operation '+kind,async()=>{const {api,backend}=await setup(),p=plan([change(api)]);p.operations[0].kind=kind;const before=stable(backend.state);assert.throws(()=>api.preview(p),/forbidden|Unsupported/);assert.equal(stable(backend.state),before);});
for(const [name,mutate]of [
 ['unknown envelope',p=>p.extra=true],['unknown operation',p=>p.operations[0].evil='execute'],['unknown payload',p=>p.operations[0].payload.evil=true],['duplicate operation IDs',p=>p.operations.push(structuredClone(p.operations[0]))],['51 operations',p=>p.operations=Array.from({length:51},(_,i)=>({...p.operations[0],id:'op.'+i}))],['missing revision',p=>delete p.operations[0].baseRevisionId],['malformed snapshot',p=>p.operations[0].payload.snapshot.page.blocks=null],['script content',p=>p.operations[0].payload.snapshot.page.summary='<script>alert(1)</script>'],['prototype object',p=>Object.setPrototypeOf(p.operations[0].payload,{polluted:true})],['oversized JSON',p=>p.summary='x'.repeat(1024*1024)],['non-JSON value',p=>p.operations[0].rationale=()=>{}],['non-finite number',p=>p.createdAt=Infinity],['malformed timestamp',p=>p.createdAt=8640000000000001]
])test('V22 strict validation rejects '+name,async()=>{const {api,backend}=await setup(),p=plan([change(api)]);mutate(p);const before=stable(backend.state);assert.throws(()=>api.preview(p));assert.equal(stable(backend.state),before);});

test('V22 JSON reserved prototype key and unsafe target URL rejected',async()=>{
 assert.throws(()=>validateChangeSet('{"__proto__":{"polluted":true}}'),/Reserved/);const {api}=await setup();for(const url of ['javascript:alert(1)','file:///private','data:text/html,test'])assert.throws(()=>api.preview(plan([personal(api,'readLater.add',{title:'Unsafe',target:{kind:'url',url}})])));
});

test('V22 pinned PDF Atlas provenance check passes against read-only verified Git blob',async()=>{assert.equal((await checkPdfatlasProvenance()).status,'PASS');});
for(const field of ['id','relativePath','sha256','bytes','pageCount','rights'])test('V22 PDF Atlas critical drift blocked: '+field,async()=>{const source=JSON.parse(await fs.readFile('config/vendor/pdfatlas.library.source.json','utf8')),enriched=structuredClone(source);enriched.entries[0][field]=field==='rights'?{status:'permission',attribution:'Wrong'}:typeof enriched.entries[0][field]==='number'?enriched.entries[0][field]+1:'wrong';assert.throws(()=>checkCriticalManifest(source,enriched),/drift|ID/);});

test('V22 semantic concept proposals remain in existing second-stage exact-target review',async()=>{
 const {api,backend}=await setup(),k=knowledgeOf(backend.state.personal),target=api.getResource(K.notebook).target,before=authored(backend.state),assignments=k.assignments.length;
 const batch={schemaVersion:1,kind:'atlas-reference-suggestions',semanticRevision:k.revision,suggestions:[{id:'proposal.v22.concept',type:'assignment',conceptId:k.concepts[0].id,target,targetRevision:api.resolveTarget(target).revision,reason:'Synthetic reviewed assignment'}]};
 await execute(api,[personal(api,'concept.assignment.propose',{batch})]);assert.equal(authored(backend.state),before);assert.equal(knowledgeOf(backend.state.personal).assignments.length,assignments);assert.equal(knowledgeOf(backend.state.personal).proposals.at(-1).status,'proposed');
});
test('V22 context exports require real opt-in booleans and bounded typed query filters',async()=>{
 const {api}=await setup();for(const arg of [{includePersonal:'false'},{includeHistory:1},{includePersonal:[]}, {resourceKeys:42}])assert.throws(()=>api.getAgentContext(arg));
 for(const arg of [{type:'unknown'},{subject:'invented'},{query:42},{query:'x'.repeat(501)},{includeStructures:'yes'},{folderId:{}}])assert.throws(()=>api.listResources(arg));assert.throws(()=>api.getStateFingerprint('database'));
});
