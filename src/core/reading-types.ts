import type {Anchor,CategoryId} from './model.js';
/** Targets retain source identity, not a rendered sheet index or DOM selector. */
export type ReadingTarget =
 | {kind:'url';url:string}
 | {kind:'page';pageId:string;anchor?:Anchor}
 | {kind:'collection';collectionId:string}
 | {kind:'pdf-page';pageId:string;documentId:string;revision?:string;pdfPage:number;anchor?:Anchor}
 | {kind:'pdf-category';pageId:string;documentId:string;revision?:string;pdfPage:number;pdfCategoryId:string};
export type ReadingItem={id:string;title:string;note:string;category:CategoryId|null;createdAt:number;target:ReadingTarget;read:boolean};
export type ReadingDestination='here'|'tab'|'pane'|1|2|3|4|5;
