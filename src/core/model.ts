import type {CheatsheetDocument} from '../cheatsheets/model.js';
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
 {type:'resource-link';label:string;description?:string;target:import('./reading-types.js').ReadingTarget} | {type:'link';pageId:string;label?:string;description?:string} | {type:'separator'|'page_break'});
export type Page={resourceLinks?:{label:string;target:import('./reading-types.js').ReadingTarget}[];kind?:'cheatsheet'|'article'|'qcm';article?:import('../content-hub/model.js').ArticleMeta;qcm?:import('../content-hub/model.js').QcmDocument;cheatsheet?:CheatsheetDocument;id:string;title:string;summary:string;blocks:Block[];related:string[];terms:string[];sources:Source[];tags:string[];provenance?:string};
export type TreeNode={target?:import('./reading-types.js').ReadingTarget;id:string;title:string;pageId?:string;children?:TreeNode[]};
export type Project={id:string;title:string;icon:string;description:string;nodes:TreeNode[]};
export type Group={id:string;title:string;projectIds:string[]};
export type Term={id:string;label:string;definition:string;translation?:string;example?:string;pageIds:string[];aliases?:string[];tags?:string[];pdfRefs?:{pageId:string;documentId:string;revision?:string;pages:number[]}[]};
export type DocumentEntry={id:string;pageId:string;title:string;source:{kind:'pack-file'|'library-file'|'https'|'external-link'|'local';path?:string;url?:string;libraryId?:string};sha256?:string;bytes?:number;pageCount?:number;visibility:'public'|'private'|'unreviewed';rights:{status:string;attribution:string;sourceUrl?:string};language?:string;defaultView?:'single'|'continuous'|'spread';packId?:string;assetKey?:string};
export type Pack={manifest:any;projects:Project[];pages:Page[];glossary:Term[];documents:DocumentEntry[];hash:string;migration:any[];assetKeys:string[]};
export type Catalogue={projects:Project[];pages:Page[];glossary:Term[];groups:Group[];documents:DocumentEntry[];owners:Record<string,string>;packs:Pack[];warnings:string[]};
export type CategoryId='informatics'|'cloud'|'norsk'|'job'|'personal';
export type WorkspaceNumber=1|2|3|4|5;
export type CompanionUI={open?:boolean;collapsed?:string[];tab?:'overview'|'pages'|'glossary'|'search';term?:string;query?:string};
export type Anchor={questionId?:string;sheetId?:string;sheetPage?:number;pdfOffset?:number;blockId?:string;offset?:number;unit?:string;viewportOffset?:number;atStart?:boolean;pdfPage?:number;pdfRevision?:string};
export type Location={sheetPage?:number;sheetMode?:'single'|'spread'|'grid';sheetZoom?:number;sheetFit?:'page'|'width';previousPresentation?:'continuous'|'parallel';previousPdfMode?:'single'|'continuous'|'spread'|'grid';previousGridMode?:'single'|'continuous'|'spread';previousGridZoom?:number;pageId:string;collectionId?:string;anchor?:Anchor;scroll?:number;presentation:'continuous'|'book'|'parallel';pdfMode:'single'|'continuous'|'spread'|'grid';pdfPage:number;zoom:number;rotation:number;cover:boolean};
export type View={referenceExplorer?:import('../references/model.js').ReferenceExplorerState;id:string;history:Location[];cursor:number;collapsed:Record<string,boolean>;revealed:Record<string,boolean>;english:boolean};
export type Pane={readerChromeCollapsed?:boolean;companionUi?:Record<string,CompanionUI>;id:string;views:View[];active:string};
export type Session={surface?:'dashboard'|'library';dashboardSubject?:import('../content-hub/model.js').SubjectKey;dashboardFolder?:string;dashboardItemId?:string;libraryFolder?:string;typeExpanded?:Partial<Record<import('../content-hub/model.js').LibraryMode,string[]>>;pdfTreeExpanded?:string[];categoryFilter?:CategoryId|null;compactTop?:boolean;collapsedPane?:string|null;collapsedGroups?:string[];panes:Pane[];activePane:string;ratio:number;screen:'home'|'reader'|'bookmarks';leftOpen:boolean;rightOpen:boolean;focus:boolean;theme:'fluent'|'neutral'|'academic'|'lavender'|'slate';libraryMode?:import('../content-hub/model.js').LibraryMode;showFlags:boolean;expanded:string[];fontSize:number};
export type Bookmark={category?:CategoryId|null;note?:string;target?:import('./reading-types.js').ReadingTarget;id:string;pageId:string;title:string;anchor?:Anchor;createdAt:number};
export type Remark={text:string;updatedAt:number;pageId:string;anchor?:Anchor;revision?:string};
// session is permanently workspace 1 (never swapped); slots 2-5 have canonical records.
export type Personal={knowledge?:import('../references/model.js').KnowledgeState;referenceLens?:boolean;dashboardItems?:import('../content-hub/model.js').DashboardItem[];qcmAttempts?:import('../content-hub/model.js').QcmAttempt[];qcmResponses?:import('../content-hub/model.js').QcmResponse[];documentVisits?:{pageId:string;firstOpenedAt:number;lastOpenedAt:number}[];readLater?:import('./reading-types.js').ReadingItem[];savedStates?:import('./saved-states-types.js').SavedStates;schemaVersion:2|3;activeWorkspaceSlot?:WorkspaceNumber;workspaceSlots?:Partial<Record<2|3|4|5,Session>>;notes:Record<string,Remark>;ratings:Record<string,'gray'|'red'|'orange'|'green'>;bookmarks:Bookmark[];session:Session};
export type StructuralOperation={kind:'add'|'move'|'rename'|'order';nodeId:string;projectId?:string;parentId?:string;node?:TreeNode;title?:string;delta?:number};
export type Overlays={taxonomy?:Record<string,import('../content-hub/model.js').TaxonomyRef|null>;references?:import('../content-hub/model.js').NotebookReference[];schemaVersion:2;companions?:Record<string,import('../companion/model.js').PdfCompanion>;glossary?:Term[];categories?:Record<string,CategoryId|null>;pages:Record<string,{page:Page;baseHash?:string}>;projects:Project[];projectPrefs:Record<string,{title?:string;icon?:string;description?:string;hidden?:boolean;order?:number}>;operations:StructuralOperation[];archived:string[];groups:Group[]|null;documents:DocumentEntry[]};
export type Asset={key:string;bytes:Uint8Array;mediaType:string;sha256:string};
export type Workspace={imports:Pack[];overlays:Overlays;personal:Personal;assets:Asset[];generation:number};
export const FLAG_LABELS={gray:'Not rated',red:'Revisit',orange:'Learning',green:'Understood'};
export const THEME_LABELS={fluent:'Fluent Blue',neutral:'Neutral/Sage',academic:'Academic Paper',lavender:'Soft Lavender',slate:'Dark Slate'};
