import type {TreeNode} from './model.js';
/** Visibility predicate over canonical nodes; no cloned tree IDs or write model. */
export function visibleLibraryNode(node:TreeNode,pdfPages:Set<string>,archived:Set<string>,mode:'notes'|'pdfs'='notes'):boolean {
 if(archived.has(node.id)||!!node.pageId&&archived.has(node.pageId))return false;
 if(mode==='notes')return true; // Original mixed workspace is preserved.
 if(node.pageId)return pdfPages.has(node.pageId);
 return !!node.children?.some(n=>visibleLibraryNode(n,pdfPages,archived,mode));
}
