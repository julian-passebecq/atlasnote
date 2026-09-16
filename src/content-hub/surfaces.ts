import type {Session,Personal,WorkspaceNumber} from '../core/model.js';
import type {LibraryMode} from './model.js';
import {selectWorkspace,WORKSPACE_NUMBERS} from '../core/workspace-slots.js';
/** App surfaces never replace the session's panes/history or global personal records. */
export function openDashboard(s:Session){s.surface='dashboard';}
export function closeSurface(s:Session){delete s.surface;delete s.dashboardItemId;}
export function selectLibrary(s:Session,mode:LibraryMode){
 const old=s.libraryMode??'notes';if(old!==mode){s.typeExpanded={...s.typeExpanded,[old]:[...s.expanded]};s.expanded=[...(s.typeExpanded[mode]??s.expanded)];}
 s.libraryMode=mode;s.leftOpen=true;
 if(mode==='notes'){delete s.surface;}else s.surface='library';
}
/** Never create slot 6, silently reset a used slot, or overwrite its reading state. */
export function firstUnusedWorkspace(p:Personal):WorkspaceNumber|undefined {
 return WORKSPACE_NUMBERS.find(n=>{const s=n===1?p.session:p.workspaceSlots?.[n];return !s||s.panes.every(p=>p.views.every(v=>!v.history.length));});
}
export function openEmptyWorkspace(p:Personal):WorkspaceNumber|undefined {const slot=firstUnusedWorkspace(p);if(slot){selectWorkspace(p,slot);const s=slot===1?p.session:p.workspaceSlots![slot]!;s.surface='dashboard';}return slot;}
