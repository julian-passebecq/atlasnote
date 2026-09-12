export type Source = {title:string;url?:string;publisher?:string;note?:string};
export type LayoutHint = {keepWithNext?:boolean;avoidBreakInside?:boolean;pageBreakBefore?:boolean;preferredSize?:'compact'|'normal'|'large'|'full-page'};
export type Block = {id:string;layout?:LayoutHint} & (
 {type:'section';title:string;children:Block[];collapsed?:boolean} |
 {type:'markdown';text:string} | {type:'callout';title:string;text:string;tone?:'info'|'warning'} |
 {type:'list';items:string[];ordered?:boolean} | {type:'table';columns:string[];rows:string[][]} |
 {type:'code';language:string;code:string;title?:string;explanation?:string;output?:string} |
 {type:'bilingual';no:string;en:string;hint?:string} | {type:'question';question:string;answer:string;followUp?:string} |
 {type:'image';src:string;alt:string;caption:string;source:Source;official?:boolean} |
 {type:'diagram';src?:string;code?:string;caption:string;source:Source;format:'mermaid'|'svg'} |
 {type:'link';pageId:string;label?:string;description?:string} | {type:'separator'|'page_break'});
export type Page={id:string;title:string;summary:string;blocks:Block[];related:string[];terms:string[];sources:Source[];tags:string[];provenance?:string};
export type TreeNode={id:string;title:string;pageId?:string;children?:TreeNode[]};
export type Project={id:string;title:string;icon:string;description:string;nodes:TreeNode[]};
export type Group={id:string;title:string;projectIds:string[]};
export type Term={id:string;label:string;definition:string;translation?:string;example?:string;pageIds:string[];aliases?:string[];tags?:string[]};
export type DocumentEntry={id:string;pageId:string;title:string;source:{kind:'pack-file'|'library-file'|'https'|'external-link'|'local';path?:string;url?:string;libraryId?:string};sha256?:string;bytes?:number;pageCount?:number;visibility:'public'|'private'|'unreviewed';rights:{status:string;attribution:string;sourceUrl?:string};language?:string;defaultView?:'single'|'continuous'|'spread';packId?:string;assetKey?:string};
export type Pack={manifest:any;projects:Project[];pages:Page[];glossary:Term[];documents:DocumentEntry[];hash:string;migration:any[];assetKeys:string[]};
export type Catalogue={projects:Project[];pages:Page[];glossary:Term[];groups:Group[];documents:DocumentEntry[];owners:Record<string,string>;packs:Pack[];warnings:string[]};
export type Anchor={blockId?:string;offset?:number;unit?:string;viewportOffset?:number;atStart?:boolean;pdfPage?:number;pdfRevision?:string};
export type Location={pageId:string;collectionId?:string;anchor?:Anchor;scroll?:number;presentation:'continuous'|'book'|'parallel';pdfMode:'single'|'continuous'|'spread';pdfPage:number;zoom:number;rotation:number;cover:boolean};
export type View={id:string;history:Location[];cursor:number;collapsed:Record<string,boolean>;revealed:Record<string,boolean>;english:boolean};
export type Pane={id:string;views:View[];active:string};
export type Session={panes:Pane[];activePane:string;ratio:number;screen:'home'|'reader'|'bookmarks';leftOpen:boolean;rightOpen:boolean;focus:boolean;theme:'fluent'|'neutral'|'academic'|'lavender'|'slate';libraryMode?:'notes'|'pdfs';showFlags:boolean;expanded:string[];fontSize:number};
export type Bookmark={id:string;pageId:string;title:string;anchor?:Anchor;createdAt:number};
export type Remark={text:string;updatedAt:number;pageId:string;anchor?:Anchor;revision?:string};
export type Personal={schemaVersion:2;notes:Record<string,Remark>;ratings:Record<string,'gray'|'red'|'orange'|'green'>;bookmarks:Bookmark[];session:Session};
export type StructuralOperation={kind:'add'|'move'|'rename'|'order';nodeId:string;projectId?:string;parentId?:string;node?:TreeNode;title?:string;delta?:number};
export type Overlays={schemaVersion:2;pages:Record<string,{page:Page;baseHash?:string}>;projects:Project[];projectPrefs:Record<string,{title?:string;icon?:string;description?:string;hidden?:boolean;order?:number}>;operations:StructuralOperation[];archived:string[];groups:Group[]|null;documents:DocumentEntry[]};
export type Asset={key:string;bytes:Uint8Array;mediaType:string;sha256:string};
export type Workspace={imports:Pack[];overlays:Overlays;personal:Personal;assets:Asset[];generation:number};
export const FLAG_LABELS={gray:'Not rated',red:'Revisit',orange:'Learning',green:'Understood'};
export const THEME_LABELS={fluent:'Fluent Blue',neutral:'Neutral/Sage',academic:'Academic Paper',lavender:'Soft Lavender',slate:'Dark Slate'};
