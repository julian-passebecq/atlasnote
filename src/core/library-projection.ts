import type {TreeNode,Project} from './model.js';
/** Visibility predicate over canonical nodes; no cloned tree IDs or write model. */
export function visibleLibraryNode(node:TreeNode,pdfPages:Set<string>,archived:Set<string>,mode:'notes'|'pdfs'='notes'):boolean {
 if(archived.has(node.id)||!!node.pageId&&archived.has(node.pageId))return false;
 if(node.pageId)return mode==='pdfs'?pdfPages.has(node.pageId):!pdfPages.has(node.pageId);
 return !!node.children?.some(n=>visibleLibraryNode(n,pdfPages,archived,mode));
}

/** Discovery totals use the same projection as the tree, not the mixed store. */
export function libraryProjectionCounts(projects:Project[],pdfPages:Set<string>,archived:Set<string>,mode:'notes'|'pdfs',hidden=new Set<string>()):{projects:number;pages:number} {
 const pages=new Set<string>();let count=0;
 function visit(node:TreeNode){if(!visibleLibraryNode(node,pdfPages,archived,mode))return;if(node.pageId)pages.add(node.pageId);else node.children?.forEach(visit);}
 for(const project of projects){if(hidden.has(project.id)||archived.has(project.id)||!project.nodes.some(n=>visibleLibraryNode(n,pdfPages,archived,mode)))continue;count++;project.nodes.forEach(visit);}
 return {projects:count,pages:pages.size};
}
