import {NORSK_DAILY_LIMITS,validateNorskDailyFeed} from './validation.mjs';

/** Local, bounded repair proposal only. Never evaluates input or writes storage.
 * A repaired feed must still pass the ordinary semantic validator. */
export function prepareNorskDailyJSON(raw,options){
 if(typeof raw!=='string')throw Error('Expected Norsk Daily JSON text');
 if(new TextEncoder().encode(raw).length>NORSK_DAILY_LIMITS.bytes)throw Error('Norsk Daily feed exceeds byte limit');
 let text=raw.trim(),corrections=[];
 if(text.startsWith('\uFEFF')){text=text.slice(1);corrections.push('Removed UTF-8 BOM');}
 const fence=text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
 if(fence){text=fence[1];corrections.push('Removed Markdown JSON fence');}
 const suffix='Do you like this personality?';
 if(text.endsWith(suffix)){text=text.slice(0,-suffix.length).trimEnd();corrections.push('Removed copied ChatGPT interface footer');}
 let value;
 try{value=JSON.parse(text);}catch{
  let out='',inString=false,escaped=false,stack=[],counts={quotes:0,closers:0,commas:0};
  for(let i=0;i<text.length;i++){
   const c=text[i];
   if(inString){
    if(escaped){out+=c;escaped=false;continue;}
    if(c==='\\'){out+=c;escaped=true;continue;}
    if(c==='"'){
     const next=text.slice(i+1).match(/^\s*(.)/s)?.[1];
     // An interior quote followed by ordinary text cannot terminate JSON.
     // Ambiguous quotes before delimiters are deliberately not guessed.
     if(next&&!/[:,}\]]/.test(next)){out+='\\"';counts.quotes++;continue;}
     inString=false;
    }
    out+=c;continue;
   }
   if(c==='"'){inString=true;out+=c;continue;}
   if(c==='{'||c==='[')stack.push(c);
   if(c==='}'||c===']'){
    const top=stack.pop();
    if(c===']'&&top==='{'){out+='}';counts.closers++;continue;}
    if(top!==(c==='}'?'{':'['))throw Error('Ambiguous JSON structure; correct it in the external chat');
   }
   if(c===','&&/^\s*[}\]]/.test(text.slice(i+1))){counts.commas++;continue;}
   out+=c;
  }
  value=JSON.parse(out);
  if(counts.quotes)corrections.push('Escaped '+counts.quotes+' interior quotation mark(s)');
  if(counts.closers)corrections.push('Replaced '+counts.closers+' object-closing bracket(s) with braces');
  if(counts.commas)corrections.push('Removed '+counts.commas+' trailing comma(s)');
 }
 if(value?.schema==='atlas.norsk-daily'&&value?.schemaVersion===2&&value.collectionInterval?.start===value.collectionInterval?.end){
  const start=value.collectionInterval.start;
  if(typeof start==='string'&&/\dT\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(start)&&Number.isFinite(Date.parse(start))){
   value.collectionInterval.end=new Date(Date.parse(start)+1).toISOString();
   if(value.source?.permission&&typeof value.source.permission.note==='string')value.source.permission.note+=' Point observation encoded as a 1 ms half-open interval for schema compatibility; this is technical normalization, not measured collection duration.';
   corrections.push('Encoded the supplied point observation with a labelled 1 ms technical interval; observation time is unchanged');
  }
 }
 const feed=validateNorskDailyFeed(value,options);
 return {feed,text:JSON.stringify(feed,null,2),corrections};
}
