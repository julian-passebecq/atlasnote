import {stable} from '../core/validation.mjs';
import type {ResourceType,ResourceSnapshot} from './model.js';
export type DiffEntry={kind:'add'|'remove'|'modify'|'move'|'rename'|'reorder';entityType:string;entityId?:string;path:string;before?:unknown;after?:unknown;words?:{kind:'same'|'remove'|'add';text:string}[]};
/** Bounded token diff: common prefix/suffix is linear; never quadratic on a large notebook. */
export function textChanges(a:string,b:string){const x=a.split(/(\s+)/),y=b.split(/(\s+)/);let first=0,end=0;while(first<Math.min(x.length,y.length)&&x[first]===y[first])first++;while(end<Math.min(x.length,y.length)-first&&x[x.length-end-1]===y[y.length-end-1])end++;return [{kind:'same' as const,text:x.slice(0,first).join('')},{kind:'remove' as const,text:x.slice(first,x.length-end).join('')},{kind:'add' as const,text:y.slice(first,y.length-end).join('')},{kind:'same' as const,text:end?x.slice(x.length-end).join(''):''}].filter(x=>x.text);}
export function semanticDiff(type:ResourceType,before:ResourceSnapshot,after:ResourceSnapshot):DiffEntry[]{
 const entries:DiffEntry[]=[];
 function walk(a:any,b:any,path:string,entity=type as string,id?:string){
  if(stable(a)===stable(b))return;
  if(a===undefined||b===undefined){entries.push({kind:a===undefined?'add':'remove',entityType:entity,entityId:id,path,...(a!==undefined?{before:a}:{}),...(b!==undefined?{after:b}:{})});return;}
  if(Array.isArray(a)&&Array.isArray(b)&&[...a,...b].every(x=>x&&typeof x==='object'&&typeof x.id==='string')){
   const aa=new Map(a.map((x,i)=>[x.id,{x,i}])),bb=new Map(b.map((x,i)=>[x.id,{x,i}]));for(const key of new Set([...aa.keys(),...bb.keys()])){const x=aa.get(key),y=bb.get(key);if(x&&y&&x.i!==y.i)entries.push({kind:'reorder',entityType:path.split('.').pop()!,entityId:key,path,before:x.i+1,after:y.i+1});walk(x?.x,y?.x,path+'['+key+']',path.split('.').pop()!,key);}return;
  }
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){for(const key of new Set([...Object.keys(a),...Object.keys(b)]))walk(a[key],b[key],path?path+'.'+key:key,entity,id);return;}
  entries.push({kind:path.endsWith('.title')?'rename':'modify',entityType:entity,entityId:id,path,before:a,after:b,...(typeof a==='string'&&typeof b==='string'?{words:textChanges(a,b)}:{})});
 }
 if(type==='notebook-tree'&&before.project&&after.project){
  const flat=(nodes:any[],parent:string,map=new Map<string,any>())=>{nodes.forEach((n,i)=>{const {children,...body}=n;map.set(n.id,{body,parent,index:i});if(children)flat(children,n.id,map);});return map;};
  const a=flat(before.project.nodes,before.project.id),b=flat(after.project.nodes,after.project.id);
  for(const id of new Set([...a.keys(),...b.keys()])){const x=a.get(id),y=b.get(id);if(x&&y){if(x.parent!==y.parent)entries.push({kind:'move',entityType:'node',entityId:id,path:'project.nodes',before:x.parent,after:y.parent});else if(x.index!==y.index)entries.push({kind:'reorder',entityType:'node',entityId:id,path:'project.nodes',before:x.index+1,after:y.index+1});walk(x.body,y.body,'node['+id+']','node',id);}else walk(x?.body,y?.body,'node['+id+']','node',id);}
  walk({...before,project:{...before.project,nodes:[]}},{...after,project:{...after.project,nodes:[]}},'');
 }else walk(before,after,'');return entries;
}
