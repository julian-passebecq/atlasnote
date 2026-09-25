import {stable} from '../core/validation.mjs';
/** V3 cross-tab personal-state merge. `base` is what THIS tab last persisted
 * (or loaded), `ours` is this tab's next state and `theirs` is what another
 * tab has since committed. A change only one side made always survives: a stale
 * tab can no longer overwrite another tab's quiz attempts, bookmarks, notes or
 * another workspace slot just because it wrote the whole record last.
 *
 * Granularity: records in id-keyed arrays, entries of keyed objects, and each
 * workspace slot session. When both tabs changed the same record/slot, the
 * caller-selected winner applies: a coalesced reading checkpoint yields
 * (`preferTheirs`), an explicit user action in this tab wins. */
const ID_ARRAYS=['bookmarks','readLater','dashboardItems','qcmAttempts','qcmResponses'];
const KEYED_OBJECTS=['notes','ratings'];
const same=(a,b)=>a===b||stable(a)===stable(b);
const clone=v=>v===undefined?undefined:structuredClone(v);
function pick(base,ours,theirs,preferTheirs,conflicts,path){
 if(same(ours,base))return {value:clone(theirs)};
 if(same(theirs,base)||same(ours,theirs))return {value:clone(ours)};
 conflicts.push(path);return {value:clone(preferTheirs?theirs:ours)};
}
function mergeKeyed(base={},ours={},theirs={},preferTheirs,conflicts,path){
 const out={};for(const key of new Set([...Object.keys(base??{}),...Object.keys(ours??{}),...Object.keys(theirs??{})])){const r=pick(base?.[key],ours?.[key],theirs?.[key],preferTheirs,conflicts,path+'.'+key);if(r.value!==undefined)out[key]=r.value;}
 return out;
}
function recordKey(r){return r&&typeof r==='object'?(r.id??r.itemId??JSON.stringify([r.setId,r.questionId,r.attemptNumber])):JSON.stringify(r);}
function mergeIdArray(base=[],ours=[],theirs=[],preferTheirs,conflicts,path){
 const index=list=>new Map((list??[]).map(r=>[recordKey(r),r]));
 const b=index(base),o=index(ours),t=index(theirs),out=[];
 // Keep this tab's order first, then records only the other tab added.
 const order=[...o.keys(),...[...t.keys()].filter(k=>!o.has(k))];
 for(const key of order){const r=pick(b.get(key),o.get(key),t.get(key),preferTheirs,conflicts,path+'['+key+']');if(r.value!==undefined)out.push(r.value);}
 return out;
}
export function mergePersonal(base,ours,theirs,{preferTheirs=false}={}){
 const conflicts=[];
 if(same(theirs,base))return {personal:clone(ours),conflicts,merged:false};
 if(same(ours,base))return {personal:clone(theirs),conflicts,merged:true};
 const out={};
 for(const key of new Set([...Object.keys(base??{}),...Object.keys(ours??{}),...Object.keys(theirs??{})])){
  if(ID_ARRAYS.includes(key)&&[base?.[key],ours?.[key],theirs?.[key]].every(v=>v===undefined||Array.isArray(v))){const merged=mergeIdArray(base?.[key],ours?.[key],theirs?.[key],preferTheirs,conflicts,key);if(ours?.[key]!==undefined||theirs?.[key]!==undefined)out[key]=merged;continue;}
  if(KEYED_OBJECTS.includes(key)||key==='workspaceSlots'){out[key]=mergeKeyed(base?.[key],ours?.[key],theirs?.[key],preferTheirs,conflicts,key);continue;}
  // The active slot is per-tab navigation; this tab never adopts another tab's.
  if(key==='activeWorkspaceSlot'){const v=ours?.[key]??theirs?.[key];if(v!==undefined)out[key]=v;continue;}
  const r=pick(base?.[key],ours?.[key],theirs?.[key],preferTheirs,conflicts,key);if(r.value!==undefined)out[key]=r.value;
 }
 // Slot 2..5 sessions are only valid in schema 3; never downgrade a peer's migration.
 if(ours?.schemaVersion===3||theirs?.schemaVersion===3){out.schemaVersion=3;out.workspaceSlots??={};out.activeWorkspaceSlot??=1;}
 if(out.activeWorkspaceSlot!==undefined&&out.activeWorkspaceSlot!==1&&!out.workspaceSlots?.[out.activeWorkspaceSlot])out.activeWorkspaceSlot=1;
 return {personal:out,conflicts,merged:true};
}
