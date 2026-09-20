import type {Catalogue,Workspace,Page,Personal,Project} from '../core/model.js';
import type {SubjectKey,QcmDocument,DashboardItem,NotebookReference,TaxonomyRef} from '../content-hub/model.js';
import {SUBJECT_COMPAT} from '../content-hub/model.js';
import {articlePage,qcmPage} from '../content-hub/content.js';
import {targetForPage} from '../core/reading-lists.js';
import {stable,walkBlocks} from '../core/validation.mjs';
import {validateHubOverlays,validateHubPersonal} from '../content-hub/validation.mjs';
import {emptyKnowledge} from '../references/knowledge.js';
import {requireExact,resolveTarget} from '../references/targets.js';
import {validateKnowledge} from '../references/validation.mjs';
import {existingReadingTargets} from './resource-source.js';
import {targetId} from '../content-hub/taxonomy.js';

const PREFIX='demo.v2.',AT=Date.UTC(2026,8,17,12),subjects:SubjectKey[]=['it','cloud','job','kpi','norsk'];
const tax=(subject:SubjectKey):TaxonomyRef=>({subject,folderId:PREFIX+'notebook.'+subject,path:['Demo / '+subject.toUpperCase()]});
const page=(id:string,title:string,text:string):Page=>({id,title,summary:'Optional local demonstration content.',blocks:[{id:id+'.body',type:'markdown',text}],related:[],terms:[],sources:[],tags:['Demo']});
const question=(id:string,prompt:string,options:[string,string][],correct:string[],explanation:string)=>({id,prompt,options:options.map(([text,explanation],i)=>({id:String.fromCharCode(97+i),text,explanation})),correctOptionIds:correct,explanation});
/** All IDs, timestamps and source fields are deterministic. Nothing is fetched or auto-loaded. */
export function demoFixture(c:Catalogue){
 const notebooks:Project[]=subjects.map(s=>({id:PREFIX+'notebook.'+s,title:'Demo / '+s.toUpperCase(),description:'Optional deterministic local demonstration.',icon:'folder',nodes:[{id:PREFIX+'node.'+s,title:'Demo study notes',pageId:PREFIX+'note.'+s}]}));
 const notes=subjects.map(s=>page(PREFIX+'note.'+s,'Demo study notes / '+s.toUpperCase(),s==='it'?'Spark shuffle: start with the keys, partition distribution and data movement. Compare the note, question, cheatsheet and PDF through References.':s==='cloud'?'Plan a copy pipeline. Record source, destination, refresh cadence, validation and failure recovery before adding transformations.':s==='job'?'Explain your assumptions, show a small example, then discuss alternatives and failure modes.':s==='kpi'?'Define numerator, denominator, grain and refresh frequency before comparing a KPI.':'Noter et nytt ord, en kort forklaring og et eksempel.'));
 const articleSpecs=[['sql','Why a join can multiply rows','Before joining an order table to a detail table, state each table\'s grain. Multiple matching detail rows can produce multiple output rows per order. Validate the keys before summing order-level values.','it'],['spark','Following a Spark shuffle','A shuffle redistributes records between partitions. Investigate key skew and data volume, not only the number of partitions. This demonstration connects a note, a QCM and existing study references.','it'],['pipeline','Pipeline review checklist','State the source and sink, schedule, idempotency strategy, retries and validation. A successful copy step does not by itself prove the business data is correct.','cloud']] as const;
 const articles=articleSpecs.map(([id,title,text,subject])=>articlePage({id:PREFIX+'article.'+id,title:'Demo / '+title,sourceType:'article',status:'inbox',publisher:'AtlasNote demonstration',addedAt:AT,taxonomy:tax(subject),blocks:[{id:PREFIX+'article.'+id+'.body',type:'markdown',text}]},AT));
 const qcms:QcmDocument[]=[
  {schemaVersion:1,id:PREFIX+'qcm.sql',title:'Demo / SQL joins and windows',taxonomy:tax('job'),questions:[
   question('join','An order has three matching detail rows. How many rows does an inner join return for that order?', [['Three','Each matching detail row forms a result row.'],['One','An inner join does not automatically aggregate or deduplicate.'],['Zero','The premise gives three matching rows.']],['a'],'The join result follows matching pairs. Aggregate at the intended grain before adding order-level measures.'),
   question('window','Which window expression calculates a row-by-row running total with a deterministic order?', [['SUM(amount) OVER (ORDER BY day, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)','The unique tie-breaker and explicit ROWS frame define row-by-row accumulation.'],['SUM(amount) OVER ()','This produces a total for the whole window, not a running total.'],['ROW_NUMBER() OVER (ORDER BY day, id)','This assigns a sequence number rather than summing values.']],['a'],'Choose both ordering and frame deliberately. Equal order keys need an explicit tie-breaker for reproducible row-by-row results.') ]},
  {schemaVersion:1,id:PREFIX+'qcm.spark',title:'Demo / Spark shuffle and partitions',taxonomy:tax('it'),questions:[
   question('shuffle','Which operations commonly require data redistribution when the required partitioning is not already available?', [['groupBy on a new key','Records with equal keys must be brought together for aggregation.'],['repartition by a different key','Changing partitioning explicitly redistributes records.'],['Selecting two columns','A simple projection alone does not need to bring matching keys together.']],['a','b'],'This multiple-answer example focuses on redistribution, not a guarantee about every optimized physical plan.'),
   question('skew','One key accounts for most records and one task runs much longer. What should you investigate first?', [['Key distribution and the physical execution plan','This tests the skew hypothesis and identifies where data is concentrated.'],['Only the font size of the notebook','Presentation does not explain uneven task workload.'],['Assume more partitions always fixes it','A single hot key can remain concentrated even with more partitions.']],['a'],'Use observed data and execution evidence before selecting a mitigation.') ]},
  {schemaVersion:1,id:PREFIX+'qcm.cloud',title:'Demo / ADF, dbt and modeling',taxonomy:tax('cloud'),questions:[
   question('adf','What is the primary role of an Azure Data Factory Copy activity?', [['Move data between a supported source and sink','A Copy activity performs data movement with supported mapping/conversion capabilities.'],['Automatically validate every business rule','Pipeline success and business correctness are different checks.'],['Replace all semantic-model measures','Measures belong to the analytical model rather than the copy step.']],['a'],'Define validation, refresh and recovery separately from the data movement step.'),
   question('dbt','A uniqueness test on a business key fails. What should the investigation establish?', [['The intended grain and why duplicate keys exist','This distinguishes invalid duplicates from an incorrectly specified test.'],['Whether changing the chart color fixes the test','Chart appearance cannot repair duplicated data.'],['That all duplicates should be deleted without review','Deleting rows without understanding grain can lose valid information.']],['a'],'Tests expose an assumption to verify; they are not instructions to delete data blindly.'),
   question('model','Before writing a sales measure in a Fabric or Power BI model, what should be explicit?', [['Fact-table grain and relationship cardinality','These determine how filtering and aggregation should behave.'],['Only the report background','Background styling cannot establish the measure\'s meaning.'],['That every numeric column is additive','Ratios, balances and repeated totals are not universally additive.']],['a'],'Start with the business definition and data grain, then validate totals at representative filter levels.') ]}
 ];
 const qcmPages=qcms.map(qcmPage),pages=[...notes,...articles,...qcmPages];
 const merged={...c,projects:[...c.projects.filter(p=>!notebooks.some(n=>n.id===p.id)),...notebooks],pages:[...c.pages.filter(p=>!pages.some(n=>n.id===p.id)),...pages]};
 const sheetPages=c.pages.filter(p=>p.cheatsheet).slice(0,3),pdfs=c.documents.filter(d=>d.pageCount).slice(0,2);
 const refs:NotebookReference[]=[...articles,...qcmPages,...sheetPages,...pdfs.map(d=>c.pages.find(p=>p.id===d.pageId)!).filter(Boolean)].map((p,i)=>({id:PREFIX+'reference.'+i,title:p.title,target:targetForPage(merged,p.id),taxonomy:tax('it'),createdAt:AT}));
 const captures:DashboardItem[]=[
  ...subjects.map(s=>({id:PREFIX+'inbox.'+s,kind:'link' as const,text:'Demo / Review '+s.toUpperCase()+' reference',url:'https://example.com/atlasnote-demo/'+s,status:'inbox' as const,taxonomy:tax(s),createdAt:AT})),
  ...['Review join grain','Compare shuffle explanations','Validate pipeline retry behavior','Completed review'].map((text,i)=>({id:PREFIX+'task.'+i,kind:'task' as const,text:'Demo / '+text,status:i===3?'done' as const:'open' as const,taxonomy:tax(i===2?'cloud':'it'),createdAt:AT,dueAt:AT+(i+1)*86400000,important:i===0,contextTarget:targetForPage(merged,qcmPages[i%3].id)})),
  ...['Record the grain before joining.','Measure skew before changing partition counts.','Add validation after a successful copy.'].map((text,i)=>({id:PREFIX+'quick-note.'+i,kind:'note' as const,text:'Demo / '+text,status:'inbox' as const,taxonomy:tax(i===2?'cloud':'it'),createdAt:AT})),
  {id:PREFIX+'archived',kind:'note',text:'Demo / Archived review note',status:'archived',createdAt:AT,taxonomy:tax('job')}
 ];
 const readingTargets=[...articles.slice(0,1),...qcmPages.slice(0,1),...sheetPages.slice(0,1)].map(p=>targetForPage(merged,p.id));
 if(pdfs[0])readingTargets.push(targetForPage(merged,pdfs[0].pageId,{pdfPage:1}));
 const bookmarks=readingTargets.map((target,i)=>({id:PREFIX+'bookmark.'+i,pageId:targetId(target),title:'Demo / Saved reference '+(i+1),category:'informatics' as const,note:'Optional demo bookmark',createdAt:AT,target}));
 const later=readingTargets.map((target,i)=>({id:PREFIX+'later.'+i,title:'Demo / Read next '+(i+1),category:'informatics' as const,note:'Optional demo reading queue',createdAt:AT,read:false,target}));
 const concept={id:PREFIX+'concept.shuffle',subject:'it' as const,label:'Demo / Spark shuffle',aliases:['Demo redistribution'],primaryParentId:'concept.it',relatedConceptIds:[],createdAt:AT,updatedAt:AT};
 const targets=[targetForPage(merged,notes[0].id,{blockId:notes[0].blocks[0].id}),targetForPage(merged,articles[1].id),{kind:'qcm' as const,setId:qcmPages[1].id,pageId:qcmPages[1].id,questionId:'shuffle'},...sheetPages.filter(p=>p.id.includes('pyspark')).map(p=>targetForPage(merged,p.id)),...pdfs.map(d=>targetForPage(merged,d.pageId,{pdfPage:1}))];
 return {notebooks,pages,refs,captures,bookmarks,later,concept,targets,sheetPages,merged};
}
const same=(a:unknown,b:unknown)=>stable(a)===stable(b);
/** Conservative cleanup: only byte-equivalent demo-owned records are removed. */
export function prepareDemo(c:Catalogue,ws:Workspace,action:'load'|'remove'):{personal:Personal;overlays:Workspace['overlays'];message:string}{
 const f=demoFixture(c),next=structuredClone(ws),o=next.overlays,p=next.personal;let retained=0;
 const merge=(old:any[]|undefined,items:any[])=>{const result=[...(old??[])];for(const item of items){const prev=result.find(x=>x.id===item.id);if(!prev)result.push(structuredClone(item));else if(!same(prev,item))retained++;}return result;};
 if(action==='load'){
  // Namespace collisions never overwrite records, including a customized demonstration.
  for(const page of f.pages){if(!c.pages.some(p=>p.id===page.id))o.pages[page.id]={page:structuredClone(page)};else if(!same(c.pages.find(p=>p.id===page.id),page))retained++;}
  o.projects=merge(o.projects,f.notebooks);o.categories??={};for(const s of subjects)if(!Object.hasOwn(o.categories,PREFIX+'notebook.'+s))o.categories[PREFIX+'notebook.'+s]=SUBJECT_COMPAT[s];
  o.references=merge(o.references,f.refs);p.dashboardItems=merge(p.dashboardItems,f.captures);p.bookmarks=merge(p.bookmarks,f.bookmarks);p.readLater=merge(p.readLater,f.later);
  o.taxonomy??={};for(const page of f.sheetPages)if(!Object.hasOwn(o.taxonomy,page.id))o.taxonomy[page.id]=tax('it');
  p.knowledge??=emptyKnowledge();p.knowledge.concepts=merge(p.knowledge.concepts,[f.concept]);
  // Use the actual retained source when a demo was edited, not invented content hashes.
  const actual={...f.merged,pages:f.merged.pages.map(pg=>o.pages[pg.id]?.page??pg)};
  const assignments=f.targets.flatMap((target,i)=>{const resolved=resolveTarget(actual,next,target);if(!resolved.available||!resolved.exact){retained++;return [];}return [{id:PREFIX+'assignment.'+i,conceptId:f.concept.id,target,targetRevision:resolved.revision,createdAt:AT,note:'Optional demonstration association; review for your own study.'}];});
  p.knowledge.assignments=merge(p.knowledge.assignments,assignments);
  // Semantic revision changes only if semantic data changed, making repeated loading idempotent.
  if(!same(ws.personal.knowledge?.concepts??emptyKnowledge().concepts,p.knowledge.concepts)||!same(ws.personal.knowledge?.assignments??[],p.knowledge.assignments))p.knowledge.revision++;
 }else{
  const removeMatches=(items:any[]|undefined,expected:any[])=>items?.filter(item=>{const original=expected.find(x=>x.id===item.id);if(!original)return true;if(!same(item,original)){retained++;return true;}return false;});
  p.bookmarks=removeMatches(p.bookmarks,f.bookmarks)!;p.readLater=removeMatches(p.readLater,f.later);o.references=removeMatches(o.references,f.refs);
  if(p.knowledge){const before=stable(p.knowledge);p.knowledge.assignments=p.knowledge.assignments.filter(a=>{if(!a.id.startsWith(PREFIX+'assignment.'))return true;const i=Number(a.id.slice((PREFIX+'assignment.').length)),target=f.targets[i];if(!target||!same(a,{id:PREFIX+'assignment.'+i,conceptId:f.concept.id,target,targetRevision:resolveTarget(f.merged,next,target).revision,createdAt:AT,note:'Optional demonstration association; review for your own study.'})){retained++;return true;}return false;});
   const used=p.knowledge.assignments.some(a=>a.conceptId===f.concept.id)||p.knowledge.proposals.some(a=>a.conceptId===f.concept.id)||p.knowledge.concepts.some(x=>x.id!==f.concept.id&&(x.primaryParentId===f.concept.id||x.relatedConceptIds.includes(f.concept.id)||x.replacedById===f.concept.id));
   if(!used)p.knowledge.concepts=removeMatches(p.knowledge.concepts,[f.concept])!;
   if(stable(p.knowledge)!==before)p.knowledge.revision++;
  }
  // Unedited demo pages are candidates. User bookmarks/references/sessions/attempts/notes keep them alive.
  const candidates=new Set(f.pages.filter(pg=>same(o.pages[pg.id],{page:pg})).map(pg=>pg.id));
  const captureCandidates=new Set(f.captures.filter(item=>same(p.dashboardItems?.find(i=>i.id===item.id),item)).map(item=>item.id));
  // Exclude only candidate captures as sources when deriving protection; other records can protect them.
  const referenceWs={...next,personal:{...p,dashboardItems:p.dashboardItems?.filter(i=>!captureCandidates.has(i.id))}};
  const externalC={...c,pages:c.pages.filter(pg=>!candidates.has(pg.id))};
  const protectedIds=new Set(existingReadingTargets(externalC,referenceWs).map(targetId));
  p.dashboardItems=p.dashboardItems?.filter(item=>{if(!captureCandidates.has(item.id))return true;if(protectedIds.has(item.id)){retained++;return true;}return false;});
  // Captures retained by user links can themselves retain their exact context targets.
  for(const item of p.dashboardItems??[])if(item.contextTarget)protectedIds.add(targetId(item.contextTarget));
  for(const a of [...(p.qcmAttempts??[]),...(p.qcmResponses??[])])protectedIds.add(a.setId);
  for(const [id,note]of Object.entries(p.notes)){protectedIds.add(id);if((note as any).pageId)protectedIds.add((note as any).pageId);}
  Object.keys(p.ratings).forEach(id=>protectedIds.add(id));
  for(const op of o.operations){for(const pr of f.notebooks)for(const node of pr.nodes)if(node.id===op.nodeId&&node.pageId)protectedIds.add(node.pageId);if(op.node){const walk=(n:any)=>{if(n.pageId)protectedIds.add(n.pageId);n.children?.forEach(walk);};walk(op.node);}}
  for(const pg of f.pages){if(!o.pages[pg.id])continue;if(!candidates.has(pg.id)||protectedIds.has(pg.id)){retained++;continue;}delete o.pages[pg.id];}
  o.projects=o.projects.filter(project=>{const original=f.notebooks.find(n=>n.id===project.id);if(!original)return true;const noteId=PREFIX+'note.'+project.id.split('.').at(-1);if(!same(project,original)||o.pages[noteId]||protectedIds.has(project.id)||o.projectPrefs[project.id]||o.operations.some(op=>JSON.stringify(op).includes(project.id))||o.references?.some(r=>r.taxonomy.folderId===project.id)||Object.values(o.pages).some(rec=>(rec.page.article?.taxonomy??rec.page.qcm?.taxonomy)?.folderId===project.id)||p.dashboardItems?.some(i=>i.taxonomy?.folderId===project.id)){retained++;return true;}if(o.categories?.[project.id]===SUBJECT_COMPAT[project.id.split('.').at(-1) as SubjectKey])delete o.categories[project.id];return false;});
  for(const pg of f.sheetPages)if(same(o.taxonomy?.[pg.id],tax('it')))delete o.taxonomy![pg.id];
 }
 validateHubOverlays(o);validateHubPersonal(p);validateKnowledge(p.knowledge);
 return {overlays:o,personal:p,message:action==='load'?'Demo data loaded locally. '+retained+' customized/colliding items left unchanged.':'Demo cleanup complete. '+retained+' edited or referenced items retained; unrelated content was not removed.'};
}
