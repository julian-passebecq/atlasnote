import {SANS_ADVANCES} from './font-metrics.mjs';
import {visitCheatsheetBlocks} from './validation.mjs';
export const plainText=v=>(typeof v==='string'?v:(v??[]).map(r=>r.text).join('')).replaceAll('\u200b','');
const normalized=v=>typeof v==='string'?[{text:v,marks:[]}]:v;
function advance(char,marks,size,mono){if(char==='\n'||char==='\u200b')return 0;return size*((mono||marks.includes('code')) ? 0.601 :(SANS_ADVANCES[char]??(/[\u3000-\uffff]/.test(char)?1:.65)))*(marks.includes('bold')||marks.includes('key')?1.045:1);}
/** Wrapping depends only on a fixed logical frame, never the browser viewport.
 * Break characters remain in the output (except the explicit U+200B hint).
 * No trimmed indentation, canvas-dependent layout or text converted to paths. */
export function layoutRich(value,width,fontSize=22,lineHeight=1.38,mono=false){
 const units=[];for(const r of normalized(value)){const marks=r.marks??[];for(const char of r.text.replaceAll('\t','    '))units.push({char,marks,width:advance(char,marks,fontSize,mono)});}
 const lines=[];let line=[],used=0;
 function emit(row){const fragments=[];for(const u of row){if(u.char==='\u200b')continue;const previous=fragments.at(-1);if(previous&&previous.marks.join(',')===u.marks.join(','))previous.text+=u.char;else fragments.push({text:u.char,marks:u.marks});}lines.push({fragments,width:row.reduce((sum,u)=>sum+u.width,0)});}
 for(const u of units){
  if(u.char==='\n'){line.push(u);emit(line);line=[];used=0;continue;}
  while(line.length&&used+u.width>width+.01){let cut=-1;for(let i=line.length-1;i>=0;i--)if([' ','\u200b','-'].includes(line[i].char)){cut=i+1;break;}if(cut<1)cut=line.length;emit(line.slice(0,cut));line=line.slice(cut);used=line.reduce((s,x)=>s+x.width,0);}
  line.push(u);used+=u.width;
 }
 if(line.length||!lines.length)emit(line);
 return {lines,height:lines.length*fontSize*lineHeight,fontSize,lineHeight,maxWidth:Math.max(0,...lines.map(l=>l.width))};
}
export function fitRich(value,width,height,style={},mono=false){
 const base=style.fontSize??22,min=Math.min(base,style.minFontSize??(mono?12:16));let size=base,result;
 do{result=layoutRich(value,width,size,style.lineHeight??1.38,mono);if(result.height<=height+.01&&result.maxWidth<=width+.01)break;if(style.overflow!=='shrink'||size<=min)break;size=Math.max(min,size-.5);}while(true);
 return {...result,overflow:result.height>height+.01||result.maxWidth>width+.01};
}
export function blockText(b){switch(b.type){case 'text':return plainText(b.text);case 'list':return b.items.map(plainText).join('\n');case 'code':return [b.title,b.code].filter(Boolean).join('\n');case 'table':return [b.columns,...b.rows].map(row=>row.map(plainText).join(' | ')).join('\n');case 'box':return [plainText(b.title),plainText(b.text)].filter(Boolean).join('\n');case 'diagram':return (b.family==='graph'?[...b.nodes.map(n=>plainText(n.label)),...b.edges.map(e=>e.label).filter(Boolean)]:b.items.map(plainText)).join(' -> ')+(b.caption?'\n'+b.caption:'');case 'image':case 'icon':return b.alt;default:return '';}}
export function cheatsheetText(doc){return doc.pages.map((p,i)=>{const text=[];visitCheatsheetBlocks(p.blocks,b=>{const s=blockText(b);if(s)text.push(s);});return '## Physical page '+(i+1)+' - '+p.title+'\n\n'+text.join('\n\n');}).join('\n\n');}
export function cheatsheetOutline(doc){return doc.pages.flatMap((p,i)=>[{id:p.id,label:p.title,sheetPage:i+1,blockId:p.outline[0]?.blockId,depth:0},...p.outline.map(a=>({...a,sheetPage:i+1,depth:1}))]);}
export function cheatsheetAnchor(doc,blockId){for(const [i,p] of doc.pages.entries()){if(p.id===blockId)return {sheetPage:i+1,sheetId:p.id};if(p.frames[blockId])return {sheetPage:i+1,sheetId:p.id,blockId};const a=p.outline.find(x=>x.id===blockId);if(a)return {sheetPage:i+1,sheetId:p.id,blockId:a.blockId};}return undefined;}
