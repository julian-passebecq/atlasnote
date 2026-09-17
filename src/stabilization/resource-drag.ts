import type {Catalogue,Workspace} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import type {TaxonomyRef} from '../content-hub/model.js';
import {validateReadingTarget} from '../storage/reading-validation.mjs';
import {inspectObject} from '../core/validation.mjs';
import {requireExact} from '../references/targets.js';
import {libraryModeForPage,addNotebookReference} from '../content-hub/content.js';
import {sharedFolders,targetId} from '../content-hub/taxonomy.js';

export const RESOURCE_DRAG_TYPE='application/x-atlas-resource';
export const RESOURCE_DRAG_LIMIT=20000;
export type ResourceDrag={schemaVersion:1;kind:'atlas-resource';target:ReadingTarget;title:string};
/** One copy-only payload for the source tree, management workspace and Notebook folders. */
export function encodeResourceDrag(target:ReadingTarget,title:string):string {
 validateReadingTarget(target);
 const raw=JSON.stringify({schemaVersion:1,kind:'atlas-resource',target,title});
 if(new TextEncoder().encode(raw).length>RESOURCE_DRAG_LIMIT)throw Error('Resource drag exceeds 20,000 bytes.');
 return raw;
}
export function parseResourceDrag(raw:string,c:Catalogue,ws:Workspace):ResourceDrag {
 if(typeof raw!=='string'||!raw||new TextEncoder().encode(raw).length>RESOURCE_DRAG_LIMIT)throw Error('Invalid or oversized resource drag.');
 let value:any;try{value=JSON.parse(raw);}catch{throw Error('Resource drag is not valid JSON.');}
 inspectObject(value);
 if(!value||Array.isArray(value)||Object.keys(value).some(k=>!['schemaVersion','kind','target','title'].includes(k))||value.schemaVersion!==1||value.kind!=='atlas-resource')throw Error('Unknown resource drag format.');
 if(typeof value.title!=='string'||!value.title.trim()||value.title.length>240)throw Error('Invalid resource drag title.');
 validateReadingTarget(value.target);requireExact(c,ws,value.target);
 const mode=libraryModeForPage(c,targetId(value.target));
 if(!['pdfs','cheatsheets','articles','qcm'].includes(mode)||!c.pages.some(p=>p.id===targetId(value.target)))throw Error('Drag a PDF, cheatsheet, Article or QCM source.');
 return structuredClone(value);
}
export function referenceDrop(raw:string,c:Catalogue,ws:Workspace,folderId:string):{target:ReadingTarget;title:string;taxonomy:TaxonomyRef} {
 const payload=parseResourceDrag(raw,c,ws),folder=sharedFolders(c,ws.overlays).find(f=>f.id===folderId);
 if(!folder)throw Error('Choose an existing Notebook folder.');
 return {...payload,taxonomy:{subject:folder.subject,folderId:folder.id,path:[...folder.path]}};
}
export function applyReferenceDrop(raw:string,c:Catalogue,ws:Workspace,folderId:string){
 const drop=referenceDrop(raw,c,ws,folderId),overlays=structuredClone(ws.overlays);
 addNotebookReference(overlays,drop.target,drop.title,drop.taxonomy);return overlays;
}
