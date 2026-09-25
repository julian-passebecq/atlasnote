import {archivedAsset,subscribeArchives} from '../durability/registry.js';
import type {Page,Asset,Catalogue} from '../core/model.js';import {store} from '../storage/database.js';import {sha256,safeUrl} from '../core/validation.mjs';
export function assetResolver(built:any,getCatalogue:()=>Catalogue){const urls=new Map<string,string>(),cache=new Map<string,Asset>();
 function url(key:string){const local=store.state.assets.find(a=>a.key===key)??archivedAsset(store.state.history,key);if(local){own();if(!urls.has(key))urls.set(key,URL.createObjectURL(new Blob([local.bytes as any],{type:local.mediaType})));return urls.get(key);}const a=built.assets.find((a:any)=>a.key===key);return a?new URL(a.path,document.baseURI).href:undefined;}
 async function asset(key:string):Promise<Asset|undefined>{const local=store.state.assets.find(a=>a.key===key)??archivedAsset(store.state.history,key);if(local)return local;if(cache.has(key))return cache.get(key);const meta=built.assets.find((a:any)=>a.key===key);if(!meta)return undefined;const response=await fetch(new URL(meta.path,document.baseURI));if(!response.ok)throw Error('Unable to read attachment '+key);const bytes=new Uint8Array(await response.arrayBuffer());if(await sha256(bytes)!==meta.sha256)throw Error('Attachment hash mismatch: '+key);const a={key,bytes,mediaType:meta.mediaType,sha256:meta.sha256};cache.set(key,a);return a;}
 // V3: the archive subscription and every object URL are owned by this resolver.
 // dispose() releases both; a later read (e.g. a StrictMode re-mount) re-subscribes.
 let unsubscribe:(()=>void)|undefined;
 const prune=()=>{for(const [key,url] of urls)if(!store.state.assets.some(a=>a.key===key)){URL.revokeObjectURL(url);urls.delete(key);}};
 const own=()=>{unsubscribe??=subscribeArchives(prune);};own();
 function dispose(){unsubscribe?.();unsubscribe=undefined;for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();cache.clear();}
 function inPage(path:string,page:Page){if(safeUrl(path))return path;const c=getCatalogue(),pack=c.packs.find(p=>p.manifest.id===c.owners[page.id]);if(!pack)return undefined;const key=pack.manifest.id+'@'+pack.manifest.version+'/'+path;return url(key);}
 function inSnapshot(path:string,page:Page,refs?:Record<string,{key:string}>){if(safeUrl(path))return path;const ref=refs?.[path];return ref?url(ref.key):inPage(path,page);}
 return {url,asset,inPage,inSnapshot,dispose,async bytes(key:string){const a=await asset(key);if(!a)throw Error('Attachment missing');return a.bytes;}};
}
