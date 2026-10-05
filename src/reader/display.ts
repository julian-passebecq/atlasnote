import type {Page,View} from '../core/model.js';
import {tableChoiceKey} from './table-columns.js';
export const DISPLAY_LABELS={metadata:'Summary & tags',sources:'Sources',text:'Text',list:'Lists',table:'Tables',code:'Code',visual:'Images & diagrams',callout:'Callouts',question:'Study questions'} as const;
export type DisplayFeature=keyof typeof DISPLAY_LABELS;
export const displayKey=(pageId:string,feature:string)=>tableChoiceKey(pageId,'display',feature);
export function displayVisible(pageId:string,view:View,feature:string){return !view.revealed[displayKey(pageId,feature)];}
export function displayFeature(kind:string):DisplayFeature|undefined {return ({paragraph:'text',text:'text',bilingual:'text',list:'list',table:'table',code:'code',image:'visual',icon:'visual',figure:'visual',drawing:'visual',diagram:'visual',mermaid:'visual',callout:'callout',box:'callout',question:'question',sources:'sources'} as Record<string,DisplayFeature>)[kind];}
export function displayFeatures(page:Page){
 const found=new Set<DisplayFeature>();if(!page.cheatsheet&&(page.summary||page.tags.length||page.article))found.add('metadata');if(!page.cheatsheet&&page.sources.length)found.add('sources');
 let bilingual=false,sections=false;
 function walk(blocks:any[]){for(const b of blocks){if(!page.cheatsheet&&b.source)found.add('sources');const feature=displayFeature(b.type);if(feature)found.add(feature);if(b.type==='bilingual')bilingual=true;if(b.type==='section')sections=true;if(b.type==='markdown'){found.add('text');if(/```/.test(b.text))found.add('code');if(/^\s*\|/m.test(b.text))found.add('table');if(/^\s*(?:[-*]|\d+\.)\s/m.test(b.text))found.add('list');}if(b.children)walk(b.children);}}
 if(page.cheatsheet)for(const sheet of page.cheatsheet.pages)walk(sheet.blocks);else walk(page.blocks);
 return {features:(Object.keys(DISPLAY_LABELS) as DisplayFeature[]).filter(f=>found.has(f)),bilingual,sections};
}
export function resetDisplay(pageId:string,view:View){for(const feature of Object.keys(DISPLAY_LABELS))delete view.revealed[displayKey(pageId,feature)];view.english=true;}
export function setAllSections(blocks:any[],view:View,collapsed:boolean){for(const b of blocks){if(b.type==='section')view.collapsed[b.id]=collapsed;if(b.children)setAllSections(b.children,view,collapsed);}}
