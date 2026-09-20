import {ID} from '../core/validation.mjs';
export const STATE_SAVE_LIMITS=Object.freeze({perScope:20,total:120,history:30,bytes:6*1024*1024});
const scopes=['all','1','2','3','4','5'];
/** Collect nested sessions for the SAME validator used by the live workspace.
 * No recursive Personal objects are permitted in saved snapshots. */
export function validateSavedStates(value,sessions){
 const fail=m=>{throw Error('Invalid saved states: '+m);};
 const obj=(v)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('object required');};
 const keys=(v,allowed)=>{obj(v);for(const k of Object.keys(v))if(!allowed.includes(k))fail('unknown field '+k);};
 const text=(v,max)=>{if(typeof v!=='string'||v.length>max)fail('text limit');};
 const integer=(v,min,max)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail('integer range');};
 const ident=v=>{if(typeof v!=='string'||!ID.test(v))fail('ID');};
 const scope=v=>{if(v!=='all')integer(v,1,5);};
 keys(value,['schemaVersion','entries','safety','history','restoreRevision']);
 if(value.schemaVersion!==1)fail('schema version');integer(value.restoreRevision,0,Number.MAX_SAFE_INTEGER);
 if(new TextEncoder().encode(JSON.stringify(value)).length>STATE_SAVE_LIMITS.bytes)fail('6 MiB storage limit');
 if(!Array.isArray(value.entries)||value.entries.length>STATE_SAVE_LIMITS.total)fail('save count');
 const ids=new Set(),counts={};
 function session(s){
  // Sessions cannot smuggle in an entire recursive saved-state store.
  keys(s,['revisionCompareMode','panes','activePane','ratio','screen','leftOpen','rightOpen','focus','theme','libraryMode','showFlags','expanded','fontSize','categoryFilter','compactTop','collapsedPane','collapsedGroups','pdfTreeExpanded','surface','dashboardSubject','dashboardFolder','dashboardItemId','libraryFolder','typeExpanded']);
  sessions.push(s);
 }
 function entry(e){
  keys(e,e?.scope==='all'?['id','title','note','createdAt','scope','session','workspaceSlots','activeWorkspaceSlot']:['id','title','note','createdAt','scope','slot','session']);
  ident(e.id);if(ids.has(e.id))fail('duplicate ID');ids.add(e.id);
  text(e.title,120);if(!e.title.trim())fail('empty title');text(e.note,500);integer(e.createdAt,0,8640000000000000);
  if(!['all','workspace'].includes(e.scope))fail('scope');
  session(e.session);
  if(e.scope==='workspace'){integer(e.slot,1,5);return String(e.slot);}
  integer(e.activeWorkspaceSlot,1,5);obj(e.workspaceSlots);
  for(const [key,s] of Object.entries(e.workspaceSlots)){if(!['2','3','4','5'].includes(key))fail('workspace slot');session(s);}
  if(e.activeWorkspaceSlot!==1&&!e.workspaceSlots[e.activeWorkspaceSlot])fail('active slot missing');return 'all';
 }
 for(const e of value.entries){const k=entry(e);counts[k]=(counts[k]??0)+1;if(counts[k]>STATE_SAVE_LIMITS.perScope)fail('20 saves per scope');}
 obj(value.safety);for(const [key,e] of Object.entries(value.safety)){if(!scopes.includes(key)||entry(e)!==key)fail('undo scope mismatch');}
 if(!Array.isArray(value.history)||value.history.length>STATE_SAVE_LIMITS.history)fail('history limit');
 const events=new Set();for(const e of value.history){keys(e,['id','action','scope','saveId','title','createdAt']);ident(e.id);ident(e.saveId);if(events.has(e.id))fail('duplicate event');events.add(e.id);if(!['save','restore','rename','delete'].includes(e.action))fail('history action');scope(e.scope);text(e.title,120);integer(e.createdAt,0,8640000000000000);}
}
