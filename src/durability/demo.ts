import type {Workspace,Page,Asset,Project,DocumentEntry} from '../core/model.js';
import {store} from '../storage/database.js';
import {compose} from '../core/workspace.js';
import {captureResources,canonical} from '../history/adapters.js';
import {revisionIdentities} from './registry.js';
import {stable,sha256} from '../core/validation.mjs';
import {existingReadingTargets} from '../stabilization/resource-source.js';
import {readingTargetId} from '../core/reading-types.js';
export const DEMO_PREFIX='demo.v23.',DEMO_AT=Date.UTC(2026,8,18),DEMO_STEPS=8;
const D=DEMO_PREFIX;
const page=(id:string,title:string):Page=>({id:D+id,title:'V2.3 durability demo / '+title,summary:'Optional synthetic history and recovery test. No private user data.',blocks:[],related:[],terms:[],sources:[],tags:['V23 durability demo']});
/** Original one-page text-only PDFs; correct object offsets/xref, no active content. */
export function syntheticPdf(variant:1|2):Uint8Array {
 const text='AtlasNote V2.3 synthetic PDF byte revision '+variant+' - original rights-safe test data.';
 const stream='BT /F1 16 Tf 45 760 Td ('+text+') Tj ET\n';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'endstream'];
 let output='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(output.length);output+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}const xref=output.length;output+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n';return new TextEncoder().encode(output);
}
export async function durabilityDemoDefinition(){
 const assets:Asset[]=[];for(const n of [1,2] as const){const bytes=syntheticPdf(n),hash=await sha256(bytes);assets.push({key:'local-pdf/'+hash+'.pdf',sha256:hash,mediaType:'application/pdf',bytes});}
 for(const name of ['historical','shared']){const bytes=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="70"><rect x="1" y="1" width="158" height="68" fill="#edf2f7" stroke="#405168"/><text x="8" y="40" font-size="14">Synthetic '+name+'</text></svg>');const hash=await sha256(bytes);assets.push({key:'local-demo-v23/'+name+'-'+hash+'.svg',sha256:hash,mediaType:'image/svg+xml',bytes});}
 const steps:Array<{step:number;pages:Page[];project:Project;document:DocumentEntry;bindings:NonNullable<Workspace['overlays']['assetBindings']>}>=[];
 for(let step=1;step<=DEMO_STEPS;step++){
  const n=page('notebook','Notebook / version '+step);n.blocks=[{id:D+'notebook.body',type:'markdown',text:'Durability experiment '+step+': save, independently verify, then recover.'}];
  if([2,3,5,6,7,8].includes(step))n.blocks.push({id:D+'notebook.code',type:'code',language:'sql',code:'SELECT '+step+' AS revision;',title:'Stable code-block identity'});
  if(step<=3)n.blocks.push({id:D+'notebook.image',type:'image',src:'historical.svg',alt:'Original synthetic historical asset',caption:'Removed from later notebook versions',source:{title:'AtlasNote synthetic fixture'}});
  n.blocks.push({id:D+'notebook.shared',type:'image',src:'shared.svg',alt:'Original shared asset',caption:'Retained by current and historical Notebook versions',source:{title:'AtlasNote synthetic fixture'}});
  if(step===3||step===7)n.blocks.reverse();
  const av=Math.min(step,5),a=page('article','Article / version '+av);a.kind='article';a.article={id:a.id,title:a.title,addedAt:DEMO_AT,taxonomy:{subject:'it'}};a.blocks=[{id:D+'article.body',type:'markdown',text:'Recovery rule '+av+': a browser download is not proof of saved-file retention.'}];
  const sv=Math.min(step,4),s=page('cheatsheet','Cheatsheet / version '+sv);s.kind='cheatsheet';s.cheatsheet={schemaVersion:'1.1',id:D+'cheatsheet.document',title:s.title,pageSize:{width:1200,height:1600},pages:[{id:D+'sheet.one',title:'Recovery checklist',blocks:[{id:D+'sheet.text',type:'text',role:'body',text:'Revision '+sv+': exact identities, verified bytes, atomic commit.'}],frames:{[D+'sheet.text']:{x:80,y:100,width:1040,height:260}},outline:[{id:D+'sheet.outline',label:'Recovery checklist',blockId:D+'sheet.text'}]}]};
  const qv=Math.min(step,4),q=page('qcm','QCM / version '+qv);q.kind='qcm';q.qcm={schemaVersion:1,id:q.id,title:q.title,taxonomy:{subject:'it'},questions:[{id:D+'qcm.question',prompt:'Revision '+qv+': what authorizes compaction?',options:[{id:D+'qcm.safe',text:'Exact saved-file re-selection plus explicit confirmation'},{id:D+'qcm.unsafe',text:'Only clicking Download'}],correctOptionIds:[D+'qcm.safe'],explanation:'Verify saved bytes independently. Generation alone never authorizes deletion.'}]};
  const pv=Math.min(step,4),p=page('pdf','Synthetic PDF / metadata '+pv),binary=assets[pv<=2?0:1];const document={id:D+'document',pageId:p.id,title:p.title,source:{kind:'local' as const},sha256:binary.sha256,bytes:binary.bytes.length,pageCount:1,visibility:'private' as const,rights:{status:'reference-only',attribution:'Original AtlasNote-generated synthetic fixture; contains no third-party or private user content.'},language:'en',assetKey:binary.key};
  const tv=Math.min(step,5),nodes=[{id:D+'node.notebook',title:n.title,pageId:n.id},{id:D+'node.article',title:'Article',pageId:a.id},{id:D+'node.sheet',title:'Cheatsheet',pageId:s.id},{id:D+'node.qcm',title:'QCM',pageId:q.id},{id:D+'node.pdf',title:'Synthetic PDF',pageId:p.id}];
  // The tree stops changing after step 5; Notebook content continues to version 8.
  nodes[0].title='Durability Notebook';if(tv>=4)nodes.reverse();
  const project:Project={id:D+'project',title:'V2.3 durability demo',description:'Optional deterministic synthetic corpus; immutable history survives safe demo cleanup.',icon:'history',nodes:[{id:D+'folder',title:tv>=2?'Reviewed archive examples':'Archive examples',children:tv>=3?nodes.slice(1):nodes},...(tv>=3?[nodes[0]]:[])]};if(tv===5)project.nodes.reverse();
  const shared={key:assets[3].key,sha256:assets[3].sha256,mediaType:assets[3].mediaType};
  const bindings:NonNullable<Workspace['overlays']['assetBindings']>={[n.id]:{'shared.svg':shared},[a.id]:{}};
  if(step<=3)bindings[n.id]['historical.svg']={key:assets[2].key,sha256:assets[2].sha256,mediaType:assets[2].mediaType};
  steps.push({step,pages:[n,a,s,q,p],project,document,bindings});
 }
 return {assets,steps};
}
export function applyDurabilityDemoStep(ws:Workspace,definition:Awaited<ReturnType<typeof durabilityDemoDefinition>>,step:number){
 const data=definition.steps[step-1];if(!data)throw Error('Invalid demo step.');
 for(const p of data.pages)ws.overlays.pages[p.id]={page:structuredClone(p)};
 ws.overlays.projects=[...ws.overlays.projects.filter(p=>p.id!==data.project.id),structuredClone(data.project)];if(ws.overlays.treeSnapshots?.[data.project.id])ws.overlays.treeSnapshots[data.project.id]=structuredClone(data.project);
 ws.overlays.documents=[...ws.overlays.documents.filter(d=>d.id!==data.document.id),structuredClone(data.document)];
 ws.overlays.assetBindings??={};for(const [id,binding]of Object.entries(data.bindings))ws.overlays.assetBindings[id]=structuredClone(binding);
 for(const asset of definition.assets)if(!ws.assets.some(a=>a.key===asset.key))ws.assets.push(structuredClone(asset));
 if(step>=1){ws.overlays.references??=[];if(!ws.overlays.references.some(r=>r.id===D+'reference'))ws.overlays.references.push({id:D+'reference',title:'Synthetic Article reference',target:{kind:'article',articleId:D+'article',pageId:D+'article'},taxonomy:{subject:'it',folderId:D+'project'},createdAt:DEMO_AT});}
}
function personalDemo(ws:Workspace){const first=revisionIdentities(ws.history).find(r=>r.resourceKey==='notebook-page:'+D+'notebook'&&r.number===1);const target:any={kind:'page',pageId:D+'notebook',...(first?{historyRevisionId:first.revisionId}:{})};return {bookmarks:[{id:D+'bookmark',pageId:D+'notebook',title:'V2.3 demo / pinned first revision',target,createdAt:DEMO_AT}],later:[{id:D+'later',title:'V2.3 demo / Read Later',note:'Synthetic personal state, never authored QCM content',category:'informatics' as const,target:{kind:'qcm' as const,setId:D+'qcm',pageId:D+'qcm'},read:false,createdAt:DEMO_AT}],captures:[{id:D+'capture',kind:'note' as const,text:'V2.3 synthetic recovery reminder',status:'inbox' as const,contextTarget:target,createdAt:DEMO_AT}],attempts:[{id:D+'attempt',setId:D+'qcm',questionId:D+'qcm.question',selectedOptionIds:[D+'qcm.safe'],correct:true,answeredAt:DEMO_AT,attemptNumber:1,reflection:'Synthetic personal attempt; editing this reflection must not create a QCM content revision.'}]};}
export async function loadDurabilityDemo(built:any){
 await store.flush();if(store.error)throw Error('Resolve the storage warning first.');const definition=await durabilityDemoDefinition(),current=compose(built,store.state),known=definition.steps.flatMap(s=>s.pages);
 for(const pg of current.pages.filter(p=>p.id.startsWith(D)))if(!known.some(p=>p.id===pg.id&&stable(p)===stable(pg)))throw Error('Customized/colliding V2.3 demo content was retained. It was not overwritten.');
 for(const expected of definition.assets){const old=store.state.assets.find(a=>a.key===expected.key);if(old&&(old.sha256!==expected.sha256||old.mediaType!==expected.mediaType||await sha256(old.bytes)!==expected.sha256))throw Error('A colliding or corrupt local asset was retained. Demo installation was refused.');}
 const project=current.projects.find(p=>p.id===D+'project');if(project&&!definition.steps.some(d=>stable(d.project)===stable(project)))throw Error('Customized demo tree retained.');
 const demoHeads=store.state.history?.heads.filter(h=>h.resourceKey.includes(':'+D))??[];for(const h of demoHeads){const last=store.state.history?.revisions.find(r=>r.revisionId===h.revisionId);if(!last?.sourceDetail?.startsWith('AtlasNote synthetic V2.3 corpus step '))throw Error('Existing history under the demo namespace was retained.');}
 const completed=Math.max(0,...demoHeads.map(h=>Number(store.state.history?.revisions.find(r=>r.revisionId===h.revisionId)?.sourceDetail?.split(' ').at(-1))||0));
 for(let step=completed+1;step<=DEMO_STEPS;step++)await store.reviewedMutation(ws=>{
  applyDurabilityDemoStep(ws,definition,step);
  if(step===2){const previous=new Map(ws.history!.heads.map(h=>[h.resourceKey,h]));const resources=captureResources(compose(built,ws),ws).filter(r=>r.resourceId.startsWith(D));const operations=resources.map((r,i)=>({id:D+'operation.'+i,kind:'resource.update',resourceKey:r.resourceKey,baseRevisionId:previous.get(r.resourceKey)?.revisionId,payload:{resourceType:r.resourceType,snapshot:r.snapshot}}));
   for(const status of ['accepted','rejected','stale'] as const){const id=D+'audit.'+status;if(ws.history!.reviews.some(r=>r.id===id)||ws.history!.archives?.some(a=>a.reviews.some(r=>r.id===id)))continue;ws.history!.reviews.push(canonical({kind:'review',schemaVersion:1,id,status,createdAt:DEMO_AT,decidedAt:DEMO_AT+1,plan:{schemaVersion:1,kind:'atlas-agent-changeset',id,source:'Synthetic fixture; explicit user demo installation',createdAt:DEMO_AT,operations},...(status==='accepted'?{selectedOperationIds:operations.map(o=>o.id)}:{reason:'Synthetic '+status+' example; never pending and never auto-approved.'})}));}
  }
 },{source:step===2?'ai':'system',summary:'Synthetic durability corpus step '+step,sourceDetail:'AtlasNote synthetic V2.3 corpus step '+step,...(step===2?{changeSetId:D+'audit.accepted'}:{})});
 await store.reviewedMutation(ws=>{if(completed===DEMO_STEPS&&!compose(built,ws).pages.some(p=>p.id===D+'notebook'))applyDurabilityDemoStep(ws,definition,DEMO_STEPS);const f=personalDemo(ws),merge=(existing:any[]|undefined,items:any[])=>[...(existing??[]),...items.filter(item=>!existing?.some(old=>old.id===item.id))];ws.personal.bookmarks=merge(ws.personal.bookmarks,f.bookmarks);ws.personal.readLater=merge(ws.personal.readLater,f.later);ws.personal.dashboardItems=merge(ws.personal.dashboardItems,f.captures);ws.personal.qcmAttempts=merge(ws.personal.qcmAttempts,f.attempts);},{source:'system',summary:'Optional synthetic personal examples',sourceDetail:'AtlasNote synthetic V2.3 corpus step 8'});
 return {status:'PASS',steps:DEMO_STEPS,message:'Optional V2.3 corpus loaded. Repeated loading retains the same content; no user content is replaced.'};
}
export async function removeDurabilityDemo(built:any){
 const definition=await durabilityDemoDefinition(),last=definition.steps.at(-1)!;let removed=0,retained=0;
 await store.reviewedMutation(ws=>{const f=personalDemo(ws),removeMatches=(rows:any[]|undefined,expected:any[])=>rows?.filter(row=>!expected.some(item=>item.id===row.id&&stable(item)===stable(row)));ws.personal.bookmarks=removeMatches(ws.personal.bookmarks,f.bookmarks)!;ws.personal.readLater=removeMatches(ws.personal.readLater,f.later);ws.personal.dashboardItems=removeMatches(ws.personal.dashboardItems,f.captures);ws.personal.qcmAttempts=removeMatches(ws.personal.qcmAttempts,f.attempts);
  const expectedRef={id:D+'reference',title:'Synthetic Article reference',target:{kind:'article',articleId:D+'article',pageId:D+'article'},taxonomy:{subject:'it',folderId:D+'project'},createdAt:DEMO_AT};ws.overlays.references=removeMatches(ws.overlays.references,[expectedRef]);
  const c=compose(built,ws),candidates=new Set(last.pages.filter(p=>stable(c.pages.find(x=>x.id===p.id))===stable(p)).map(p=>p.id)),external={...c,pages:c.pages.filter(p=>!candidates.has(p.id))};
  const protectedIds=new Set(existingReadingTargets(external,ws).map(readingTargetId));
  // Keep any demo page mentioned by a remaining authored object, including legacy
  // block links/related IDs that are not ReadingTargets. False positives retain data.
  const externalText=JSON.stringify(external.pages);for(const p of last.pages)if(externalText.includes(JSON.stringify(p.id)))protectedIds.add(p.id);
  for(const item of [...(ws.personal.qcmAttempts??[]),...(ws.personal.qcmResponses??[])])protectedIds.add(item.setId);
  for(const [key,note]of Object.entries(ws.personal.notes)){protectedIds.add(key);protectedIds.add(note.pageId);}for(const key of Object.keys(ws.personal.ratings))protectedIds.add(key);
  const demoTree=c.projects.find(p=>p.id===D+'project'),treeUnchanged=stable(demoTree)===stable(last.project);
  const walk=(nodes:any[])=>nodes.forEach(n=>{if(n.pageId)protectedIds.add(n.pageId);if(n.children)walk(n.children);});for(const pr of c.projects)if(pr.id!==D+'project'||!treeUnchanged)walk(pr.nodes);
  if(ws.overlays.operations.some(op=>JSON.stringify(op).includes(D)))last.pages.forEach(p=>protectedIds.add(p.id));
  for(const p of last.pages){if(!ws.overlays.pages[p.id])continue;if(!candidates.has(p.id)||protectedIds.has(p.id)){retained++;continue;}delete ws.overlays.pages[p.id];delete ws.overlays.assetBindings?.[p.id];ws.overlays.documents=ws.overlays.documents.filter(d=>d.pageId!==p.id);removed++;}
  if(treeUnchanged&&removed){const kept=new Set(last.pages.filter(p=>ws.overlays.pages[p.id]).map(p=>p.id));const prune=(nodes:Project['nodes']):Project['nodes']=>nodes.flatMap(n=>n.pageId&&!kept.has(n.pageId)?[]:[{...n,...(n.children?{children:prune(n.children)}:{})}]);const adjusted={...structuredClone(last.project),nodes:prune(last.project.nodes)};ws.overlays.projects=ws.overlays.projects.map(p=>p.id===adjusted.id?adjusted:p);if(ws.overlays.treeSnapshots?.[adjusted.id])ws.overlays.treeSnapshots[adjusted.id]=adjusted;}
  if(!last.pages.some(p=>ws.overlays.pages[p.id])&&!protectedIds.has(D+'project')&&stable(c.projects.find(p=>p.id===D+'project'))===stable(last.project)&&!ws.overlays.references?.some(r=>r.taxonomy.folderId===D+'project')){ws.overlays.projects=ws.overlays.projects.filter(p=>p.id!==D+'project');delete ws.overlays.treeSnapshots?.[D+'project'];}
  // Immutable history, review audit and historical assets are NEVER removed here.
 },{source:'system',summary:'Remove unchanged optional V2.3 demo projections',sourceDetail:'Demo cleanup keeps all historical evidence'});
 return {removed,retained,message:'Removed '+removed+' unchanged demo pages; retained '+retained+' edited/referenced pages. History, audit and historical assets remain recoverable.'};
}
