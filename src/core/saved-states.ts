import type {Personal,WorkspaceNumber} from './model.js';
import type {SaveScope,SavedStates,StateSave,SaveEvent} from './saved-states-types.js';
import {activeSession,migratePersonal} from './workspace-slots.js';
import {blankPersonal,uid} from './workspace.js';
import {validatePersonal} from '../storage/personal-validation.mjs';
import {STATE_SAVE_LIMITS} from '../storage/saved-states-validation.mjs';
export {STATE_SAVE_LIMITS};
export const saveScope=(s:StateSave):SaveScope=>s.scope==='all'?'all':s.slot;
export const scopeLabel=(scope:SaveScope)=>scope==='all'?'All workspaces':'Workspace '+scope;
const empty=():SavedStates=>({schemaVersion:1,entries:[],safety:{},history:[],restoreRevision:0});
export function latestStateSave(p:Personal,scope:SaveScope):StateSave|undefined{
 return p.savedStates?.entries.filter(e=>saveScope(e)===scope).sort((a,b)=>b.createdAt-a.createdAt)[0];
}
function snapshot(p:Personal,scope:SaveScope,title:string,now:number):StateSave{
 const base={id:uid('save'),title:title.trim().slice(0,120)||scopeLabel(scope),note:'',createdAt:now};
 if(scope==='all')return {...base,scope:'all',session:structuredClone(p.session),workspaceSlots:structuredClone(p.workspaceSlots??{}),activeWorkspaceSlot:p.activeWorkspaceSlot??1};
 const s=scope===1?p.session:p.workspaceSlots?.[scope];
 return {...base,scope:'workspace',slot:scope,session:structuredClone(s??blankPersonal().session)};
}
function event(s:SavedStates,action:SaveEvent['action'],e:StateSave,now:number){
 s.history=[{id:uid('event'),action,scope:saveScope(e),saveId:e.id,title:e.title,createdAt:now},...s.history].slice(0,STATE_SAVE_LIMITS.history);
}
/** Validate BEFORE mutating the supplied Personal object. The store then writes
 * sessions + undo snapshot in a single IndexedDB personal transaction. */
function publish(p:Personal,next:Personal){validatePersonal(next);Object.assign(p,next);}
export function saveReadingState(p:Personal,scope:SaveScope,title=scopeLabel(scope),now=Date.now()):string{
 const next=structuredClone(migratePersonal(p));next.savedStates??=empty();
 if(next.savedStates.entries.filter(e=>saveScope(e)===scope).length>=STATE_SAVE_LIMITS.perScope)throw Error('20 saves already exist for '+scopeLabel(scope)+'. Remove an old save in Saved states first.');
 const e=snapshot(next,scope,title,now);next.savedStates.entries.unshift(e);event(next.savedStates,'save',e,now);publish(p,next);return e.id;
}
export function restoreReadingState(p:Personal,id:string,now=Date.now()):SaveScope{
 const saved=p.savedStates;const original=saved?.entries.find(e=>e.id===id)??Object.values(saved?.safety??{}).find(e=>e?.id===id);
 if(!original)throw Error('That saved state no longer exists.');
 const next=structuredClone(migratePersonal(p)),s=next.savedStates!,e=structuredClone(original),scope=saveScope(e);
 s.safety[scope]=snapshot(next,scope,'Before restore - '+scopeLabel(scope),now);
 if(e.scope==='all'){next.session=structuredClone(e.session);next.workspaceSlots=structuredClone(e.workspaceSlots);next.activeWorkspaceSlot=e.activeWorkspaceSlot;}
 else {if(e.slot===1)next.session=structuredClone(e.session);else {next.workspaceSlots??={};next.workspaceSlots[e.slot]=structuredClone(e.session);}next.activeWorkspaceSlot=e.slot;}
 // Browser fullscreen is not requested here. Logical Focus, if saved, remains
 // CSS-only until the user deliberately enters browser fullscreen again.
 s.restoreRevision++;event(s,'restore',e,now);publish(p,next);return scope;
}
export function renameReadingState(p:Personal,id:string,title:string,note:string,now=Date.now()){
 if(!title.trim()||title.length>120||note.length>500)throw Error('Use a title of 1-120 characters and a note of at most 500 characters.');
 const next=structuredClone(p),s=next.savedStates,e=s?.entries.find(e=>e.id===id);
 if(!s||!e)throw Error('That saved state no longer exists.');
 e.title=title.trim();e.note=note;event(s,'rename',e,now);publish(p,next);
}
export function deleteReadingState(p:Personal,id:string,now=Date.now()){
 const next=structuredClone(p),s=next.savedStates;if(!s)throw Error('No saved states.');
 const e=s.entries.find(e=>e.id===id);if(!e)throw Error('That saved state no longer exists.');
 s.entries=s.entries.filter(e=>e.id!==id);event(s,'delete',e,now);publish(p,next);
}
export function sessionSummary(e:StateSave){
 const sessions=e.scope==='all'?[e.session,...Object.values(e.workspaceSlots)]:[e.session];
 const tabs=sessions.reduce((n,s)=>n+s.panes.reduce((m,p)=>m+p.views.length,0),0);
 return (e.scope==='all'?'5 workspaces':'Workspace '+e.slot)+' / '+tabs+' tab'+(tabs===1?'':'s');
}
