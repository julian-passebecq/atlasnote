import type {Catalogue, Overlays, Page, Project, TreeNode, DocumentEntry} from './model.js';
import {findNode, normalize} from './workspace.js';

export type CollectionItem = {node:TreeNode;project:Project;page?:Page;document?:DocumentEntry;type:'folder'|'note'|'pdf';language:string;domains:string[];technologies:string[];summary:string};
export type CollectionFilter = {type:string;language:string;domain:string;technology:string;text:string;sort:string};
export const facetValues=(tags:string[],namespace:string)=>tags.filter(t=>t.startsWith(namespace+':')).map(t=>t.slice(namespace.length+1));

/** Pure derived projection. No collection table and no copied Page/Document IDs. */
export function collectionTarget(c:Catalogue,id:string){
 const project=c.projects.find(p=>p.id===id);
 if(project)return {project,title:project.title,path:[project.title],nodes:project.nodes};
 const found=findNode(c.projects,id);
 if(!found||found.node.pageId)return undefined;
 const path=found.ancestors.map(a=>c.projects.find(p=>p.id===a)?.title??findNode(c.projects,a)?.node.title??a);
 return {project:found.project,folder:found.node,title:found.node.title,path:[...path,found.node.title],nodes:found.node.children??[]};
}
export function collectionItems(c:Catalogue,o:Overlays,id:string):CollectionItem[]{
 const target=collectionTarget(c,id);if(!target)return [];
 const archived=new Set(o.archived);
 const pages=new Map(c.pages.map(p=>[p.id,p])),docs=new Map(c.documents.map(d=>[d.pageId,d]));
 return target.nodes.filter(n=>!archived.has(n.id)&&!archived.has(n.pageId??'')).map(node=>{
  const page=pages.get(node.pageId??''),document=docs.get(node.pageId??''),tags=page?.tags??[];
  return {node,project:target.project,page,document,type:node.children?'folder':document?'pdf':'note',language:document?.language??facetValues(tags,'lang')[0]??'unknown',domains:facetValues(tags,'domain'),technologies:facetValues(tags,'tech'),summary:page?.summary||document?.rights.attribution|| (node.children?`${node.children.length} direct items`:'')};
 });
}
export function filterCollection(items:CollectionItem[],filter:CollectionFilter){
 const words=normalize(filter.text).trim().split(/\s+/).filter(Boolean);
 const result=items.filter(i=>(filter.type==='all'||i.type===filter.type)&&(!filter.language||i.language===filter.language)&&(!filter.domain||i.domains.includes(filter.domain))&&(!filter.technology||i.technologies.includes(filter.technology))&&words.every(w=>normalize([i.page?.title??i.node.title,i.summary,...(i.page?.tags??[]),i.document?.rights.attribution??''].join(' ')).includes(w)));
 return filter.sort==='title'?[...result].sort((a,b)=>(a.page?.title??a.node.title).localeCompare(b.page?.title??b.node.title,undefined,{sensitivity:'base'})):result;
}
