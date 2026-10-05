/** Pane-local reading preferences. The authored table remains complete. */
// Disclosure-map keys must satisfy the existing 120-character ASCII ID contract.
// This bounded deterministic encoding identifies preferences, never authored revisions.
function preferenceKey(prefix:string,parts:unknown[]){let hash=14695981039346656037n;for(const c of JSON.stringify(parts)){hash^=BigInt(c.codePointAt(0)!);hash=BigInt.asUintN(64,hash*1099511628211n);}return prefix+'.'+hash.toString(16).padStart(16,'0');}
export const tableColumnKey=(pageId:string,column:string,index:number)=>preferenceKey('table-hidden',[pageId,column,index]);
export const tableOptionsKey=(pageId:string,blockId:string)=>preferenceKey('table-options',[pageId,blockId]);
export const tableLayoutKey=(pageId:string,layout:'pairs'|'lines')=>preferenceKey('table-layout',[pageId,layout]);
export function tableLayout(pageId:string,revealed:Record<string,boolean>){return revealed[tableLayoutKey(pageId,'lines')]?'lines':revealed[tableLayoutKey(pageId,'pairs')]?'pairs':'table';}
export function visibleTableColumns(pageId:string,columns:string[],revealed:Record<string,boolean>,print=false){
 const visible=columns.map((_,i)=>i).filter(i=>print||!(revealed[tableColumnKey(pageId,columns[i],i)]??i>=3));
 return visible.length?visible:columns.length?[0]:[];
}
