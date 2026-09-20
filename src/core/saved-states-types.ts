import type {Session, WorkspaceNumber} from './model.js';
export type SaveScope = WorkspaceNumber | 'all';
export type StateSave = {
 id:string; title:string; note:string; createdAt:number;
} & ({scope:'workspace';slot:WorkspaceNumber;session:Session} |
     {scope:'all';session:Session;workspaceSlots:Partial<Record<2|3|4|5,Session>>;activeWorkspaceSlot:WorkspaceNumber});
export type SaveEvent={id:string;action:'save'|'restore'|'rename'|'delete';scope:SaveScope;saveId:string;title:string;createdAt:number};
/** Only reading sessions are copied. No embedded saves, PDF bytes or library data. */
export type SavedStates={schemaVersion:1;entries:StateSave[];safety:Partial<Record<SaveScope,StateSave>>;history:SaveEvent[];restoreRevision:number};
