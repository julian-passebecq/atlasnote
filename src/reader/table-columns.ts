/** Pane-local reading preferences. The authored table remains complete. */
// Disclosure-map keys must satisfy the existing 120-character ASCII ID contract.
// This bounded deterministic encoding identifies preferences, never authored revisions.
function preferenceKey(prefix:string,parts:unknown[]){let hash=14695981039346656037n;for(const c of JSON.stringify(parts)){hash^=BigInt(c.codePointAt(0)!);hash=BigInt.asUintN(64,hash*1099511628211n);}return prefix+'.'+hash.toString(16).padStart(16,'0');}
export const tableColumnKey=(pageId:string,column:string,index:number)=>preferenceKey('table-hidden',[pageId,column,index]);
export const tableOptionsKey=(pageId:string,blockId:string)=>preferenceKey('table-options',[pageId,blockId]);
export const TABLE_LAYOUTS=['table','pairs','lines','cards2','cards3','dictionary','tiles'] as const;
export const TABLE_PALETTES=['black','ocean','forest','paper'] as const;
export const TABLE_SORTS=['source','norsk','english','reverse'] as const;
export const TABLE_GROUPS=['none','letter','category','type'] as const;
export const TABLE_PRESETS=['compact','alphabet','themes','relations','grammar'] as const;
export type TableLayout=typeof TABLE_LAYOUTS[number];
export const tableLayoutKey=(pageId:string,layout:TableLayout)=>preferenceKey('table-layout',[pageId,layout]);
export const tableChoiceKey=(pageId:string,kind:string,value:string)=>preferenceKey('table-choice',[pageId,kind,value]);
export function tableLayout(pageId:string,revealed:Record<string,boolean>):TableLayout{return TABLE_LAYOUTS.find(mode=>mode!=='table'&&revealed[tableLayoutKey(pageId,mode)])??'table';}
export function tableChoice(pageId:string,revealed:Record<string,boolean>,kind:'sort'|'group'|'palette'){const choices=kind==='sort'?TABLE_SORTS:kind==='palette'?TABLE_PALETTES:TABLE_GROUPS;return choices.find(value=>revealed[tableChoiceKey(pageId,kind,value)])??choices[0];}
export function setTableChoice(pageId:string,state:Record<string,boolean>,kind:'sort'|'group'|'palette',value:string){for(const mode of kind==='sort'?TABLE_SORTS:kind==='palette'?TABLE_PALETTES:TABLE_GROUPS)state[tableChoiceKey(pageId,kind,mode)]=mode===value;}
export function setTableLayout(pageId:string,state:Record<string,boolean>,value:string){for(const mode of TABLE_LAYOUTS)state[tableLayoutKey(pageId,mode)]=mode===value;}
const heading=(s:string)=>s.trim().toLowerCase();
export function tableFields(columns:string[]){const find=(pattern:RegExp)=>columns.findIndex(c=>pattern.test(heading(c)));return {category:find(/^(category|categories|categor[iy]e|catégorie|kategori|tema|theme|thème|topic)$/),type:find(/^(type|word class|part of speech|ordklasse)$/),english:find(/^(english|en|anglais)$/),relations:columns.map((c,i)=>/^(synonyms?|antonyms?|opposites?|synonymes?|antonymes?|opposés?)$/.test(heading(c))?i:-1).filter(i=>i>=0),grammar:columns.map((c,i)=>/^(forms?|gender|infinitiv|presens|preteritum|ubestemt|bestemt|bøyning|inflection)/.test(heading(c))?i:-1).filter(i=>i>=0)};}
export function applyTablePreset(pageId:string,columns:string[],state:Record<string,boolean>,preset:string){
 const fields=tableFields(columns),selected=new Set([0,Math.min(1,columns.length-1),...(preset==='relations'?fields.relations:preset==='grammar'?fields.grammar:[])]);
 columns.forEach((column,i)=>{state[tableColumnKey(pageId,column,i)]=!selected.has(i);});
 setTableLayout(pageId,state,preset==='grammar'?'table':'cards2');
 setTableChoice(pageId,state,'sort',preset==='alphabet'?'norsk':'source');
 setTableChoice(pageId,state,'group',preset==='alphabet'?'letter':preset==='themes'?(fields.category>=0?'category':fields.type>=0?'type':'none'):'none');
}
const norskOrder=new Intl.Collator('nb',{sensitivity:'base',numeric:true});
/** Detached reading projection; authored row order and text never change. */
export function organizeTableRows(columns:string[],rows:string[][],sort:string,group:string){
 const fields=tableFields(columns),items=rows.map((row,index)=>({row,index})),column=sort==='english'?Math.max(0,fields.english):0;
 if(sort!=='source')items.sort((a,b)=>(sort==='reverse'?-1:1)*norskOrder.compare(a.row[column]??'',b.row[column]??'')||a.index-b.index);
 const groups=new Map<string,typeof items>();
 for(const item of items){const value=group==='letter'?(item.row[0]?.trim().match(/^\p{L}/u)?.[0].toLocaleUpperCase('nb')??'#'):group==='category'&&fields.category>=0?item.row[fields.category].trim()||'Other':group==='type'&&fields.type>=0?item.row[fields.type].trim()||'Other':'';if(!groups.has(value))groups.set(value,[]);groups.get(value)!.push(item);}
 const result=[...groups].map(([title,items])=>({title,items}));
 return group==='none'?result:result.sort((a,b)=>norskOrder.compare(a.title,b.title));
}
export function visibleTableColumns(pageId:string,columns:string[],revealed:Record<string,boolean>,print=false){
 const visible=columns.map((_,i)=>i).filter(i=>print||!(revealed[tableColumnKey(pageId,columns[i],i)]??i>=3));
 return visible.length?visible:columns.length?[0]:[];
}
