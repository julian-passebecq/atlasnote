import type {Catalogue,Overlays,Session,Project,TreeNode} from '../core/model.js';
import type {LibraryMode,SubjectKey} from '../content-hub/model.js';
import {locations} from '../core/workspace.js';
import {projectSubject} from '../content-hub/taxonomy.js';
import {readingTargetId} from '../core/reading-types.js';
import {evaluate,effectiveProfile,isAllContent,profileFromPreset,LIBRARY_MODES,SUBJECT_KEYS} from './profile.mjs';
export type ResourceFacts={id:string;type:LibraryMode;subject?:SubjectKey;projectId?:string;title:string};
export type ExperienceProfile={schemaVersion:1;presetId:string;presetRevision:number;name?:string;types:Record<LibraryMode,boolean>;subjects:{mode:'all'|'selected'|'none';ids?:string[]};projects:{mode:'all'|'selected'|'none';ids?:string[]};pdfs:{mode:'all'|'selected'|'none';ids?:string[]};include:string[];exclude:string[]};
/** Canonical metadata facts for every resource, built in one pass per
 * catalogue/overlay generation (O(n)), so tree rows, search results, counts and
 * loaders share one evaluator without repeated whole-library array scans. */
export function buildResourceFacts(c:Catalogue,o:Overlays):Map<string,ResourceFacts>{
 const locs=locations(c),pdfPages=new Set(c.documents.map(d=>d.pageId)),facts=new Map<string,ResourceFacts>(),subjects=new Map<string,SubjectKey|undefined>();
 const subjectOf=(projectId:string)=>{if(!subjects.has(projectId))subjects.set(projectId,projectSubject(projectId,o));return subjects.get(projectId);};
 for(const p of c.pages){
  const type:LibraryMode=pdfPages.has(p.id)?'pdfs':p.kind==='cheatsheet'?'cheatsheets':p.kind==='article'?'articles':p.kind==='qcm'?'qcm':'notes';
  const l=locs.get(p.id),override=Object.hasOwn(o.taxonomy??{},p.id),t=override?o.taxonomy![p.id]??undefined:p.article?.taxonomy??p.qcm?.taxonomy;
  facts.set(p.id,{id:p.id,type,subject:override||t?t?.subject:l?subjectOf(l.project.id):undefined,projectId:l?.project.id,title:p.title});
 }
 for(const r of o.references??[])facts.set(r.id,{id:r.id,type:'notes',subject:r.taxonomy?.subject,title:r.title});
 return facts;
}
const cache=new WeakMap<Catalogue,{overlays:Overlays;facts:Map<string,ResourceFacts>}>();
export function resourceFacts(c:Catalogue,o:Overlays){const hit=cache.get(c);if(hit?.overlays===o)return hit.facts;const facts=buildResourceFacts(c,o);cache.set(c,{overlays:o,facts});return facts;}
export function sessionProfile(s:Session|undefined):ExperienceProfile{return effectiveProfile(s) as ExperienceProfile;}
export function inExperience(profile:ExperienceProfile,facts:ResourceFacts|undefined):boolean{return !facts||evaluate(profile,facts).visible;}
/** Prune a projected library tree. Folders stay only if they still hold a
 * visible resource; empty authored folders remain visible in All content. */
export function filterProjects(projects:Project[],profile:ExperienceProfile,facts:Map<string,ResourceFacts>):Project[]{
 if(isAllContent(profile))return projects;
 const keep=(ns:TreeNode[]):TreeNode[]=>ns.flatMap(n=>{
  const id=n.pageId??(n.target?readingTargetId(n.target):undefined);
  if(id!==undefined&&!n.children)return inExperience(profile,facts.get(id))?[n]:[];
  const children=keep(n.children??[]);return children.length?[{...n,children}]:[];
 });
 return projects.map(p=>({...p,nodes:keep(p.nodes)})).filter(p=>p.nodes.length);
}
export type ExperienceCounts={visible:number;total:number;byType:Record<LibraryMode,number>;bySubject:Record<string,number>};
export function experienceCounts(profile:ExperienceProfile,facts:Map<string,ResourceFacts>):ExperienceCounts{
 const byType=Object.fromEntries(LIBRARY_MODES.map((m:string)=>[m,0])) as Record<LibraryMode,number>,bySubject:Record<string,number>=Object.fromEntries(SUBJECT_KEYS.map((s:string)=>[s,0]));let visible=0;
 for(const f of facts.values())if(evaluate(profile,f).visible){visible++;byType[f.type]++;if(f.subject)bySubject[f.subject]=(bySubject[f.subject]??0)+1;}
 return {visible,total:facts.size,byType,bySubject};
}
export const presetProfile=(id:string)=>profileFromPreset(id) as unknown as ExperienceProfile;
