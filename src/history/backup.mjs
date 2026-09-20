import {validateHistory,strictKeys} from './validation.mjs';
import {sha256,stable,safePath} from '../core/validation.mjs';
/** Bounded shards keep the existing 25 MiB archive-entry limit intact. */
export async function writeHistoryFiles(files,history){
 await validateHistory(history);const revisionShards=[],reviewShards=[];
 const shard=(records,prefix,paths)=>{let batch=[],size=2,index=0;const flush=()=>{if(!batch.length)return;const path='history/'+prefix+'-'+String(index++).padStart(4,'0')+'.json';files.set(path,JSON.stringify(batch));paths.push(path);batch=[];size=2;};for(const record of records){const bytes=new TextEncoder().encode(JSON.stringify(record)).length;if(size+bytes>2*1024*1024)flush();batch.push(record);size+=bytes+1;}flush();};
 shard(history.revisions,'revisions',revisionShards);shard(history.reviews,'reviews',reviewShards);
 files.set('history/index.json',JSON.stringify({schemaVersion:1,meta:history.meta,heads:history.heads,...(history.archives!==undefined?{archives:history.archives}:{}),revisionShards,reviewShards,hash:await sha256(stable(history))}));return {schemaVersion:1,indexPath:'history/index.json'};
}
export async function readHistoryFiles(files,root,pointer,assets){
 strictKeys(pointer,['schemaVersion','indexPath'],'backup history pointer');
 if(pointer?.schemaVersion!==1||pointer.indexPath!=='history/index.json')throw Error('Missing/invalid full-backup history index');
 const read=path=>{safePath(path);const data=files.get(root+path);if(!data)throw Error('Missing history archive entry: '+path);return JSON.parse(new TextDecoder().decode(data));};
 const index=read(pointer.indexPath);strictKeys(index,['schemaVersion','meta','heads','archives','revisionShards','reviewShards','hash'],'history index');if(index.schemaVersion!==1||!Array.isArray(index.revisionShards)||!Array.isArray(index.reviewShards)||index.revisionShards.length+index.reviewShards.length>1000)throw Error('Invalid history shards');
 const all=[...index.revisionShards,...index.reviewShards];if(new Set(all).size!==all.length||all.some(p=>!/^history\/(revisions|reviews)-\d{4}\.json$/.test(p)))throw Error('Invalid/duplicate history shard path');
 const h={schemaVersion:1,meta:index.meta,heads:index.heads,...(index.archives!==undefined?{archives:index.archives}:{}),revisions:index.revisionShards.flatMap(read),reviews:index.reviewShards.flatMap(read)};
 if(await sha256(stable(h))!==index.hash)throw Error('History archive hash mismatch');await validateHistory(h,assets,true);return h;
}
