/** Search only an already-open, permitted PDF. Never fetch for Context alone. */
export type PdfTextHit={page:number;excerpt:string};
export type PdfTextResult={hits:PdfTextHit[];searched:number;total:number;hasText:boolean};
export type PdfTextSearcher=(query:string,signal:AbortSignal)=>Promise<PdfTextResult>;
const engines=new Map<string,PdfTextSearcher>();
const key=(slot:number,pane:string,doc:string)=>JSON.stringify([slot,pane,doc]);
export function registerPdfTextSearch(slot:number,pane:string,doc:string,search:PdfTextSearcher){
 const id=key(slot,pane,doc);engines.set(id,search);
 return()=>{if(engines.get(id)===search)engines.delete(id);};
}
export function searchOpenPdf(slot:number,pane:string,doc:string,query:string,signal:AbortSignal):Promise<PdfTextResult>{
 const search=engines.get(key(slot,pane,doc));
 if(!search)return Promise.reject(Error('Open this PDF in the integrated reader and allow its source before searching selectable text. Category and page-heading search remains available here.'));
 return search(query,signal);
}
export async function searchPdfText(pdf:{numPages:number;getPage:(n:number)=>Promise<any>},query:string,signal:AbortSignal):Promise<PdfTextResult>{
 const needle=query.trim().toLocaleLowerCase(),hits:PdfTextHit[]=[];let hasText=false;
 const searched=Math.min(pdf.numPages,1000);if(!needle)return {hits,searched:0,total:pdf.numPages,hasText:false};
 for(let page=1;page<=searched;page++){
  if(signal.aborted)throw new DOMException('Search cancelled','AbortError');
  const p=await pdf.getPage(page),content=await p.getTextContent();
  if(signal.aborted)throw new DOMException('Search cancelled','AbortError');
  const text=content.items.map((item:any)=>typeof item.str==='string'?item.str:'').join(' ');hasText=hasText||!!text.trim();
  const at=text.toLocaleLowerCase().indexOf(needle);if(at>=0)hits.push({page,excerpt:text.slice(Math.max(0,at-45),at+needle.length+130)});
  if(page%10===0)await new Promise(r=>setTimeout(r,0));
 }
 return {hits,searched,total:pdf.numPages,hasText};
}
