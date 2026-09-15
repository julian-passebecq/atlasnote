import type {Personal,Page,Block,Overlays,Catalogue} from './model.js';
import {walkBlocks,stable,sha256} from './validation.mjs';
/** A bounded list of local document visits, not workspace snapshots or analytics. */
export function recordDocumentVisit(personal:Personal,pageId:string,now=Date.now()):void {
 const previous=personal.documentVisits?.find(v=>v.pageId===pageId);
 const lastOpenedAt=Math.max(now,previous?.lastOpenedAt??now);
 personal.documentVisits=[{pageId,firstOpenedAt:previous?.firstOpenedAt??now,lastOpenedAt},...(personal.documentVisits??[]).filter(v=>v.pageId!==pageId)].slice(0,50);
}
export function documentBlockMatches(page:Page,query:string):{id:string;title:string;excerpt:string}[]{
 const needle=query.trim().toLocaleLowerCase();if(!needle)return [];
 const hits:{id:string;title:string;excerpt:string}[]=[];
 walkBlocks(page.blocks,(block:Block)=>{
  const fields=Object.entries(block).filter(([key])=>!['id','type','children','src','source','layout'].includes(key)).map(([,v])=>typeof v==='string'?v:Array.isArray(v)?v.flat().join(' '):'');
  const text=fields.join(' '),at=text.toLocaleLowerCase().indexOf(needle);
  if(at>=0)hits.push({id:block.id,title:'title' in block?block.title??block.type:block.type,excerpt:text.slice(Math.max(0,at-45),at+needle.length+130)});
 });return hits.slice(0,80);
}
/** Use the normal page overlay: links are private edits until explicitly exported. */
export async function relatedPageOverlay(catalogue:Catalogue,overlays:Overlays,pageId:string,targetId:string,remove=false){
 const page=overlays.pages[pageId]?.page??catalogue.pages.find(p=>p.id===pageId);
 if(!page||!catalogue.pages.some(p=>p.id===targetId)||pageId===targetId)throw Error('Choose a different document from this library.');
 const related=remove?page.related.filter(id=>id!==targetId):[...new Set([...page.related,targetId])];
 const baseHash=overlays.pages[pageId]?.baseHash??await sha256(stable(page));
 return {page:{...page,related},baseHash};
}
