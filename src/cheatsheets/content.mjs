import {validateCheatsheet,CHEATSHEET_LIMITS} from './validation.mjs';
import {cheatsheetAnchor} from './text-layout.mjs';
/** Canonical source only. Rendered SVG is never part of the stored page. */
/** @returns {import('../core/model.js').Page} */
export function cheatsheetPage(document,{pageId='page.cheatsheet.'+document.id,related=[]}={}){
 validateCheatsheet(document);
 if(typeof pageId!=='string'||!/^[A-Za-z][A-Za-z0-9._-]{0,119}$/.test(pageId))throw Error('Invalid wrapper page ID; supply an explicit stable page ID.');
 return {id:pageId,kind:'cheatsheet',title:document.title,summary:document.subtitle??'Native structured study reference',blocks:[],cheatsheet:structuredClone(document),related:[...related],terms:[],sources:[{title:'AtlasNote structured cheatsheet source',note:document.meta?.provenance??'Locally authored reference'}],tags:['cheatsheet',document.id],provenance:document.meta?.provenance??'Local structured JSON'};
}
export function parseCheatsheetSource(source){
 if(typeof source!=='string'||new TextEncoder().encode(source).length>CHEATSHEET_LIMITS.bytes)throw Error('Cheatsheet JSON must be at most 4 MiB.');
 let document;try{document=JSON.parse(source);}catch{throw Error('This is not valid JSON. No content was imported.');}
 return validateCheatsheet(document);
}
export function sheetPosition(document,location){
 const resolved=location.anchor?.blockId?cheatsheetAnchor(document,location.anchor.blockId):undefined;
 const stablePage=location.anchor?.sheetId?document.pages.findIndex(p=>p.id===location.anchor.sheetId):undefined;
 const page=resolved?.sheetPage??(stablePage!==undefined&&stablePage>=0?stablePage+1:location.sheetPage??location.anchor?.sheetPage??1);
 return {page,available:!(stablePage===-1&&!resolved)&&Number.isInteger(page)&&page>=1&&page<=document.pages.length,anchorMissing:!!location.anchor?.blockId&&!resolved};
}
export function sheetGroup(document,location){
 const {page,available}=sheetPosition(document,location),size=location.sheetMode==='grid'?4:location.sheetMode==='spread'?2:1;
 const start=Math.floor((page-1)/size)*size+1;
 return {page,available,size,start,pages:available?Array.from({length:Math.min(size,document.pages.length-start+1)},(_,i)=>start+i):[]};
}
/** @param {number} page @param {string} [blockId] @param {string} [sheetId] @returns {Partial<import('../core/model.js').Location>} */
export function sheetPagePatch(page,blockId=undefined,sheetId=undefined){
 if(!Number.isSafeInteger(page)||page<1||page>64)throw Error('Physical cheatsheet page is outside 1-64.');
 return {sheetPage:page,anchor:{sheetPage:page,...(blockId?{blockId}:{}),...(sheetId?{sheetId}:{})},scroll:0};
}
export function downloadCheatsheet(document){
 validateCheatsheet(document);
 const url=URL.createObjectURL(new Blob([JSON.stringify(document,null,2)+'\n'],{type:'application/json'}));
 const a=globalThis.document.createElement('a');a.href=url;a.download=document.id+'.cheatsheet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
