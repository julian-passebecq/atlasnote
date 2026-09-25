/** V3 (MEM-02) shared cache for byte-verified PDFs, keyed by the reviewed SHA-256.
 * - Concurrent readers (pane A and B, a workspace switch) share ONE download and
 *   ONE hash verification.
 * - Each reader holds a lease; the object URL is never revoked while leased.
 * - Unleased entries stay reusable within a byte budget and are evicted least
 *   recently used first. Private/local assets never enter this cache: it only
 *   holds bytes the fetcher has already verified against the reviewed hash.
 * - If every reader leaves before the download finishes, the download aborts. */
export type Lease={url:Promise<string>;release:()=>void};
type Entry={promise:Promise<string>;controller:AbortController;refs:number;size:number;url?:string;lastUsed:number};
export function createVerifiedCache(fetcher:(key:string,signal:AbortSignal)=>Promise<Uint8Array>,budgetBytes=300*1024*1024,
 urls:{create:(b:Blob)=>string;revoke:(u:string)=>void}={create:b=>URL.createObjectURL(b),revoke:u=>URL.revokeObjectURL(u)}){
 const entries=new Map<string,Entry>();
 function evict(){
  let total=[...entries.values()].reduce((n,e)=>n+(e.url?e.size:0),0);
  for(const [key,e] of [...entries].sort((a,b)=>a[1].lastUsed-b[1].lastUsed)){
   if(total<=budgetBytes)break;if(e.refs>0||!e.url)continue;
   urls.revoke(e.url);entries.delete(key);total-=e.size;
  }
 }
 function acquire(key:string,mediaType='application/pdf'):Lease{
  let e=entries.get(key);
  if(!e){
   const controller=new AbortController(),entry:Entry={controller,refs:0,size:0,lastUsed:Date.now(),promise:Promise.resolve('')};
   entry.promise=fetcher(key,controller.signal).then(bytes=>{const blob=new Blob([bytes as BlobPart],{type:mediaType});entry.size=blob.size;entry.url=urls.create(blob);evict();return entry.url;});
   entry.promise.catch(()=>{if(entries.get(key)===entry)entries.delete(key);});
   entries.set(key,entry);e=entry;
  }
  const entry=e;entry.refs++;entry.lastUsed=Date.now();let released=false;
  return {url:entry.promise,release(){
   if(released)return;released=true;entry.refs--;entry.lastUsed=Date.now();
   if(entry.refs===0&&!entry.url){entry.controller.abort();if(entries.get(key)===entry)entries.delete(key);}
   evict();
  }};
 }
 function stats(){const list=[...entries.values()];return {entries:list.length,leased:list.filter(e=>e.refs>0).length,bytes:list.reduce((n,e)=>n+(e.url?e.size:0),0),inFlight:list.filter(e=>!e.url).length};}
 function clear(){for(const [key,e] of entries)if(e.refs===0){if(e.url)urls.revoke(e.url);else e.controller.abort();entries.delete(key);}}
 return {acquire,stats,clear};
}
