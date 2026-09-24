/** V3 physical-page input contract. The text is only committed on explicit
 * submit (Enter/Go); typing "1" on the way to "19" never navigates. Blank,
 * non-integer and out-of-range values are rejected with a message instead of
 * silently becoming page 1 (Number('') === 0 used to clamp to the cover). */
export function parsePageInput(text,count){
 const value=String(text??'').trim();
 const max=Number.isInteger(count)&&count>0?count:0;
 if(!max)return {ok:false,message:'The PDF is still opening.'};
 if(!/^\d{1,7}$/.test(value))return {ok:false,message:'Enter a physical page from 1 to '+max+'.'};
 const page=Number(value);
 if(page<1||page>max)return {ok:false,message:'Page '+page+' is outside this PDF (1 to '+max+').'};
 return {ok:true,page};
}
/** Human label for the pages actually displayed. Spread/grid show the range
 * while the requested physical page keeps its own identity. */
export function pageRangeLabel(pages,count){
 const shown=(pages??[]).filter(n=>Number.isInteger(n)&&n>0);
 const total=count>0?String(count):'...';
 if(shown.length<2)return (shown[0]??1)+' / '+total;
 return shown[0]+'–'+shown[shown.length-1]+' / '+total;
}
/** PDF-03: the printed label (e.g. "vii") is display-only and shown only when it
 * differs from the physical number. Navigation, links and saved positions always
 * use the physical page; typing "2" means physical page 2, never printed "2". */
export function printedLabelFor(labels,page){
 if(!Array.isArray(labels)||!Number.isInteger(page)||page<1||page>labels.length)return undefined;
 const label=typeof labels[page-1]==='string'?labels[page-1].trim():'';
 return label&&label!==String(page)?label.slice(0,24):undefined;
}
