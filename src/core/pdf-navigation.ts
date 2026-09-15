import type {Project,TreeNode,DocumentEntry} from './model.js';
export type PdfNavEntry={project:Project;node:TreeNode;document:DocumentEntry;path:string[]};
export type PdfNavSubject={id:string;title:string;entries:PdfNavEntry[]};
export type PdfNavSection={id:string;title:string;entries:PdfNavEntry[];subjects:PdfNavSubject[]};
/** Read-only PDF projection. Drop notebook groups/project wrappers and retain at
 * most two useful taxonomy folders. Canonical nodes/IDs/metadata are untouched. */
export function pdfNavigationSections(projects:Project[],documents:DocumentEntry[],archived:Set<string>,hidden=new Set<string>()):PdfNavSection[]{
 const sections=new Map<string,PdfNavSection>(),byPage=new Map(documents.map(d=>[d.pageId,d]));
 const generic=(title:string)=>/^(pdf atlas|pdfs?|pdf documents?|documents?|references?)$/i.test(title.trim());
 for(const project of projects){
  if(hidden.has(project.id)||archived.has(project.id))continue;
  const visit=(nodes:TreeNode[],parents:TreeNode[])=>{for(const node of nodes){
   if(archived.has(node.id)||node.pageId&&archived.has(node.pageId))continue;
   const doc=node.pageId?byPage.get(node.pageId):undefined;
   if(doc){
    const folders=parents.filter(p=>!generic(p.title)).slice(-2);
    const domain=folders[0]??{id:project.id,title:generic(project.title)?'PDF Library':project.title};
    const subject=folders.length>1?folders[1]:undefined;
    let section=sections.get(domain.id);if(!section){section={id:domain.id,title:domain.title,entries:[],subjects:[]};sections.set(domain.id,section);}
    const entry={project,node,document:doc,path:[project.title,...parents.map(p=>p.title),node.title]};
    if(subject){let group=section.subjects.find(s=>s.id===subject.id);if(!group){group={id:subject.id,title:subject.title,entries:[]};section.subjects.push(group);}group.entries.push(entry);}else section.entries.push(entry);
   }
   if(node.children)visit(node.children,[...parents,node]);
  }};visit(project.nodes,[]);
 }
 return [...sections.values()];
}
