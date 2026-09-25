/** Bounded, privacy-reviewed PDF navigation trace (V3 reader contract).
 * Records timings, deltas, physical page numbers, modes, generations and
 * restoration reasons only: never PDF text, titles, URLs or file names.
 * Nothing leaves the browser unless the user explicitly downloads it. */
const ALLOWED=new Set(['t','type','pane','slot','doc','gen','reason','mode','page','to','from','dy','dx','dm','top','bottom','turn','latched','pending','scrolling','delta','offset','n','result','count','visible']);
export function createNavigationTrace(limit=400){
 const rows=[];let dropped=0;const pseudonyms=new Map();
 const alias=value=>{if(value===undefined||value===null)return undefined;const key=String(value);if(!pseudonyms.has(key))pseudonyms.set(key,'d'+(pseudonyms.size+1));return pseudonyms.get(key);};
 function record(type,fields={}){
  const row={t:Math.round((typeof performance!=='undefined'?performance.now():Date.now())*10)/10,type:String(type).slice(0,40)};
  for(const [key,value] of Object.entries(fields)){
   if(!ALLOWED.has(key)||value===undefined)continue;
   if(key==='doc'){row.doc=alias(value);continue;}
   if(typeof value==='number')row[key]=Number.isFinite(value)?Math.round(value*1000)/1000:null;
   else if(typeof value==='boolean')row[key]=value;
   else if(Array.isArray(value))row[key]=value.filter(Number.isFinite).slice(0,8);
   else row[key]=String(value).slice(0,40);
  }
  rows.push(row);if(rows.length>limit){rows.shift();dropped++;}
  return row;
 }
 const snapshot=()=>({schema:'atlas-pdf-navigation-trace/1',privacy:'Timings, wheel deltas, physical page numbers, modes, generations and restore reasons only. No PDF text, titles, URLs or file names; document IDs are replaced by local pseudonyms.',limit,dropped,rows:rows.map(r=>({...r}))});
 const clear=()=>{rows.length=0;dropped=0;};
 return {record,snapshot,clear,get size(){return rows.length;}};
}
/** One shared buffer per page load, so A and B traces interleave in time order. */
export const navigationTrace=createNavigationTrace();
