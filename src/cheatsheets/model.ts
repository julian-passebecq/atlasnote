/** Canonical, JSON-only cheatsheet grammar. Frames are logical page coordinates. */
export type Frame={x:number;y:number;width:number;height:number};
export type Mark='bold'|'italic'|'underline'|'code'|'key'|'highlight';
export type RichText=string|{text:string;marks?:Mark[]}[];
export type TextRole='body'|'title'|'section'|'example'|'caption'|'key'|'warning';
export type TextStyle={fontSize?:number;lineHeight?:number;minFontSize?:number;overflow?:'shrink'|'clip'|'error';align?:'left'|'center'|'right'};
export type BaseBlock={id:string;style?:TextStyle};
export type DiagramNode={id:string;label:RichText;shape?:'roundedRect'|'rect'|'circle'|'diamond';assetKey?:string};
export type DiagramEdge={from:string;to:string;label?:string;dashed?:boolean};
export type CheatsheetBlock=BaseBlock & (
 {type:'text';text:RichText;role?:TextRole} |
 {type:'list';items:RichText[];ordered?:boolean;gap?:number} |
 {type:'box';variant?:'note'|'warning';title?:RichText;text?:RichText;children?:CheatsheetBlock[]} |
 {type:'table';columns:RichText[];rows:RichText[][];widths?:number[]} |
 {type:'code';code:string;language:string;title?:string} |
 {type:'divider'} |
 {type:'diagram';family:'sequence';preset:'steps'|'array'|'stack'|'queue'|'linked_list';direction:'horizontal'|'vertical';items:RichText[];link?:'arrow'|'none';caption?:string} |
 {type:'diagram';family:'graph';layout:'manual'|'tree';preset?:'tree'|'dag'|'flow';nodes:DiagramNode[];nodeFrames:Record<string,Frame>;edges:DiagramEdge[];caption?:string} |
 {type:'drawing';shapes:({type:'line';x1:number;y1:number;x2:number;y2:number}|{type:'rect'|'ellipse';x:number;y:number;width:number;height:number})[]} |
 {type:'icon'|'image';assetKey:string;alt:string}
);
export type CheatsheetPage={id:string;title:string;blocks:CheatsheetBlock[];frames:Record<string,Frame>;outline:{id:string;label:string;blockId:string}[]};
export type CheatsheetDocument={schemaVersion:'1.0'|'1.1';id:string;title:string;subtitle?:string;pageSize:{width:1200;height:1600};meta?:{audience?:string;goal?:string;difficulty?:'intro'|'intermediate'|'advanced';provenance?:string};theme?:{name:'atlas-calm';tokens?:Partial<Record<'paper'|'ink'|'primary'|'secondary'|'line'|'code'|'warning'|'warningFill',string>>};pages:CheatsheetPage[]};
