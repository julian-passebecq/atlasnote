import type {Anchor,CategoryId} from './model.js';
/** Targets retain source identity, not a rendered sheet index or DOM selector. */
export type ReadingTarget = ({historyRevisionId?:string} & (
 | {kind:'article';articleId:string;pageId?:string;anchor?:Anchor}
 | {kind:'qcm';setId:string;pageId?:string;questionId?:string}
 | {kind:'dashboard-item';itemId:string}
 | {kind:'url';url:string}
 | {kind:'cheatsheet-page';pageId:string;documentId:string;sheetPage:number;anchor?:Anchor}
 | {kind:'page';pageId:string;anchor?:Anchor}
 | {kind:'collection';collectionId:string}
 | {kind:'pdf-page';pageId:string;documentId:string;revision?:string;pdfPage:number;anchor?:Anchor}
 | {kind:'pdf-category';pageId:string;documentId:string;revision?:string;pdfPage:number;pdfCategoryId:string}));
export type ReadingItem={id:string;title:string;note:string;category:CategoryId|null;createdAt:number;target:ReadingTarget;read:boolean};
export type ReadingDestination='here'|'tab'|'pane'|1|2|3|4|5;

/** All content uses the same routing family; ReadingTarget remains a compatible public name. */
export type ResourceTarget=ReadingTarget;
export const readingTargetId=(t:ReadingTarget):string=>t.kind==='url'?t.url:t.kind==='collection'?t.collectionId:t.kind==='article'?t.pageId??t.articleId:t.kind==='qcm'?t.pageId??t.setId:t.kind==='dashboard-item'?t.itemId:t.pageId;
