/** Synthetic examples only. Run after build:offline; no network or live database. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {built,setup,authoredFixtures,basePage,assetResolver,plan,edit,personal} from '../tests/v22/fixtures.mjs';
import {makeBackup,readBackup,unzipBounded} from '../src/storage/archives.mjs';
import {loadSchemas} from '../src/core/packs.mjs';
import {prepareWorkspaceHistory,assertProjection} from '../dist-offline/app/history/engine.js';
import {compose} from '../dist-offline/app/core/workspace.js';
import {migratePersonal} from '../dist-offline/app/core/workspace-slots.js';
import {knowledgeOf} from '../dist-offline/app/references/knowledge.js';
import {operationRegistry} from '../dist-offline/app/agent/registry.js';
// The default is the explicit documentation-authoring command. Runtime tests
// always supply a private temporary directory; never regenerate tracked docs.
const args=process.argv.slice(2);
if(args.length && (args.length!==2 || args[0]!=='--output-dir' || !args[1].trim() || args[1].startsWith('--'))) {
 throw Error('Usage: node tools/generate-v22-examples.mjs [--output-dir DIRECTORY]');
}
const out=path.resolve(args.length?args[1]:'docs/examples/v22');
await fs.mkdir(out,{recursive:true});
const {api,backend}=await setup();const N='notebook-page:page.atlas.welcome',A='article:page.v22.article',T='notebook-tree:project.atlas.guide',P='pdf:doc.atlas.pdf';
let sequence=0;const plans=[];
async function example(ops,label){const p=plan(ops,'example.'+(++sequence));p.summary=label;api.preview(p);await fs.writeFile(out+'/changeset-'+String(sequence).padStart(2,'0')+'.json',JSON.stringify(p,null,2));await api.stage(p);await api.accept(p.id);plans.push({file:'changeset-'+String(sequence).padStart(2,'0')+'.json',label,operations:ops.map(o=>o.kind)});return p;}
function op(key,kind,payload){return {id:'example.operation.'+(sequence+1)+'.'+kind,kind,resourceKey:key,baseRevisionId:api.getResource(key).head.revisionId,payload};}
await fs.writeFile(out+'/capabilities.json',JSON.stringify(api.getAgentCapabilities(),null,2));
await fs.writeFile(out+'/initial-context.json',JSON.stringify(api.getAgentContext({resourceKeys:[N,A,T,P],includeHistory:true}),null,2));
await example([{id:'create.page',kind:'resource.create',resourceKey:'notebook-page:page.example.new',baseRevisionId:null,payload:{resourceType:'notebook-page',snapshot:{page:basePage('page.example.new','Created from a reviewed proposal')}}}],'Create a canonical Notebook page');
for(const key of [N,A,'cheatsheet:page.cheatsheet.azure-data-factory','qcm:page.v22.qcm'])await example([edit(api,key,s=>{if(s.page.cheatsheet)s.page.cheatsheet.pages[0].blocks[0].text+=' Example edit';else if(s.page.qcm)s.page.qcm.questions[0].explanation+=' Example rationale.';else s.page.blocks[0].text+=' Example reviewed text.';})],'Update canonical '+key);
const first=api.listResourceVersions(N).items.at(-1).revisionId;
await example([op(N,'resource.restoreAsNewRevision',{revisionId:first})],'Restore old source as a new version');
await example([edit(api,N,s=>s.page.summary+=' Draft, not current','resource.draft')],'Retain draft metadata without changing current source');
await example([op(A,'taxonomy.assign',{taxonomy:{subject:'cloud'}})],'Assign canonical Article taxonomy');
const pid=api.getResource(T).resourceId,node='node.example.folder';
await example([op(T,'notebook.tree.createNode',{operation:{kind:'add',projectId:pid,nodeId:node,node:{id:node,title:'Review examples',children:[]}}})],'Create a Notebook structural folder');
await example([op(T,'notebook.tree.renameNode',{operation:{kind:'rename',nodeId:node,title:'Reviewed examples'}})],'Rename a stable Notebook node');
await example([op(T,'notebook.tree.reorderNode',{operation:{kind:'order',nodeId:node,delta:-1}})],'Reorder Notebook siblings');
const leaf=api.getResource(T).snapshot.project.nodes.find(n=>n.id!==node).id;
await example([op(T,'notebook.tree.moveNode',{operation:{kind:'move',nodeId:leaf,projectId:pid,parentId:node}})],'Reparent a stable Notebook node');
const target=api.getResource(A).target;
await example([op(N,'resource.link.add',{target,label:'Exact authored link'})],'Add typed authored link');
await example([op(N,'resource.link.update',{index:0,target,label:'Reviewed authored link'})],'Update typed authored link');
await example([op(N,'resource.link.remove',{index:0})],'Remove typed authored link');
const source=api.getResource(N).target;
await example([personal(api,'reference.add',{source,target,sourceRevision:api.resolveTarget(source).revision,targetRevision:api.resolveTarget(target).revision,kind:'related'})],'Add semantic edge through exact-target service');
await example([personal(api,'reference.remove',{id:knowledgeOf(backend.state.personal).edges.at(-1).id})],'Remove semantic edge');
const k=knowledgeOf(backend.state.personal),batch={schemaVersion:1,kind:'atlas-reference-suggestions',semanticRevision:k.revision,suggestions:[{id:'proposal.example.concept',type:'assignment',conceptId:k.concepts[0].id,target, targetRevision:api.resolveTarget(target).revision,reason:'Example reviewed assignment'}]};
await example([personal(api,'concept.assignment.propose',{batch})],'Stage concept assignment for the existing semantic review');
await example([personal(api,'concept.create',{id:'concept.example.vocabulary',subject:'norsk',label:'Example word',aliases:['example'],parentId:'concept.norsk',assignTo:target,note:'Reviewed vocabulary concept'})],'Create a subject concept and link it to an exact target (V3)');
await example([personal(api,'bookmark.add',{target,title:'Example bookmark'}),personal(api,'readLater.add',{target,title:'Example Read Later'}),personal(api,'capture.create',{kind:'note',text:'Example reviewed capture'})],'Reviewed personal writes, not content history');
await example([personal(api,'bookmark.remove',{id:backend.state.personal.bookmarks.at(-1).id}),personal(api,'readLater.remove',{id:backend.state.personal.readLater.at(-1).id}),personal(api,'capture.update',{id:backend.state.personal.dashboardItems.at(-1).id,text:'Updated example capture',status:'done'})],'Reviewed personal update/removal');
await example([personal(api,'workspace.navigate',{target,destination:5}),personal(api,'workspace.compare',{enabled:true,mode:'side-by-side',pane:'B'})],'Reviewed layout/navigation, not content history');
await example([edit(api,P,s=>{s.document.title+=' Reviewed metadata';s.page.title=s.document.title;},'pdf.metadata.update')],'PDF metadata edit with unchanged reviewed bytes');
await example([edit(api,P,s=>{s.companion.categories[0].title+=' Reviewed';},'pdf.revision.propose')],'PDF logical revision using already reviewed source');
const demonstrated=new Set(plans.flatMap(p=>p.operations));if(Object.keys(operationRegistry).some(k=>!demonstrated.has(k)))throw Error('An operation lacks an executable synthetic example');
await fs.writeFile(out+'/INDEX.json',JSON.stringify({scope:'Synthetic examples, generated and accepted sequentially in a unit backend; not browser evidence. Refresh resource/base/fingerprint IDs for a real workspace.',plans},null,2));
await fs.writeFile(out+'/accepted-history.json',JSON.stringify(backend.state.history,null,2));
const schemas=await loadSchemas(n=>fs.readFile('src/content/schemas/'+n,'utf8'));
for(const version of [2,3]){
 const ws=authoredFixtures();if(version===3)ws.personal=migratePersonal(ws.personal);const old=await makeBackup(ws,built,assetResolver);await fs.writeFile(out+'/synthetic-v21-schema-'+version+'.atlas-backup.zip',old.bytes);
 const restored=(await readBackup((await unzipBounded(old.bytes)).files,schemas)).workspace;const upgraded=await prepareWorkspaceHistory(built,restored,{source:'migration',summary:'Synthetic V2.1 backup migration'});await assertProjection(compose(built,upgraded),upgraded);
 const next=await makeBackup(upgraded,built,assetResolver);await fs.writeFile(out+'/synthetic-v22-from-'+version+'.atlas-backup.zip',next.bytes);
}
console.log(JSON.stringify({status:'PASS',operationKinds:demonstrated.size,examplePlans:plans.length,migrationFixtures:4,scope:'Unit serializer/service examples, not IndexedDB/browser evidence'},null,2));
