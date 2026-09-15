import type {Personal,Session,WorkspaceNumber,CategoryId,View} from './model.js';
import {blankPersonal} from './workspace.js';
export const WORKSPACE_NUMBERS:WorkspaceNumber[]=[1,2,3,4,5];
export const CATEGORIES:{id:CategoryId;label:string;icon:string}[]=[
 {id:'informatics',label:'Informatics',icon:'code'}, {id:'cloud',label:'Cloud',icon:'cloud'},
 {id:'norsk',label:'Norsk',icon:'language'}, {id:'job',label:'Job',icon:'briefcase'}, {id:'personal',label:'Personal',icon:'person'}
];
/** Normalized backward-compatible storage: `session` is always slot 1, not the
 * currently active session. Other slots are durable records, never snapshots
 * opportunistically swapped into session. All app mutations use this accessor. */
export function activeSession(personal:Personal,slot:WorkspaceNumber=personal.activeWorkspaceSlot??1):Session {
 const session=slot===1?personal.session:personal.workspaceSlots?.[slot];
 if(!session)throw Error('Workspace '+slot+' has not been initialized');
 return session;
}
export function migratePersonal(personal:Personal):Personal {
 if(![2,3].includes(personal.schemaVersion))throw Error('Unsupported personal-state version; data retained.');
 if(personal.schemaVersion===3)return personal;
 // Preserves slot 1 byte-for-byte, including optional-property absence.
 return {...personal,schemaVersion:3,activeWorkspaceSlot:1,workspaceSlots:{}};
}
export function selectWorkspace(personal:Personal,slot:WorkspaceNumber):void {
 if(!WORKSPACE_NUMBERS.includes(slot))throw Error('Workspace must be 1 to 5');
 if(personal.schemaVersion===2)Object.assign(personal,migratePersonal(personal));
 if(slot!==1&&!personal.workspaceSlots![slot])personal.workspaceSlots![slot]=blankPersonal().session;
 personal.activeWorkspaceSlot=slot;
}
export function allSessions(personal:Personal):Session[]{return [personal.session,...Object.values(personal.workspaceSlots??{})];}
export function collapsePane(session:Session,id:string):void {
 if(session.panes.length!==2||!session.panes.some(p=>p.id===id))return;
 if(session.collapsedPane===id){session.collapsedPane=null;session.activePane=id;return;}
 if(session.collapsedPane)return; // Never hide the only visible survivor.
 session.collapsedPane=id;session.activePane=session.panes.find(p=>p.id!==id)!.id;
}
export function revealPane(session:Session,id:string):void {
 if(!session.panes.some(p=>p.id===id))return;
 if(session.collapsedPane===id)session.collapsedPane=null;
 session.activePane=id;
}
export function toggleQuickLayout(view:View,pdf:boolean):void {
 const loc=view.history[view.cursor];if(!loc)return;
 if(pdf){if(loc.pdfMode==='grid'){loc.pdfMode='spread';loc.zoom=loc.previousGridZoom??loc.zoom;delete loc.previousGridMode;delete loc.previousGridZoom;return;}if(loc.pdfMode==='spread')loc.pdfMode=loc.previousPdfMode??'single';else {loc.previousPdfMode=loc.pdfMode;loc.pdfMode='spread';}}
 else {if(loc.presentation==='book')loc.presentation=loc.previousPresentation??'continuous';else {loc.previousPresentation=loc.presentation;loc.presentation='book';}}
}
/** Classification is explicit data, never inferred from user titles. */
export const BUILTIN_CATEGORIES:Record<string,CategoryId>={
 'project.interview-preparation':'job',
 'project.atlas.guide':'personal','example.project':'personal','project.pdfatlas':'informatics',
 ...Object.fromEntries(['python','sql','pandas','pyspark'].map(n=>['project.samples.'+n,'informatics' as const])),
 'project.samples.azure':'cloud','project.samples.databricks':'cloud','project.samples.norsk':'norsk',
 'project.samples.job':'job','project.samples.personal':'personal'
};
export function categoryMatches(projectId:string,filter:CategoryId|null|undefined,overrides:Record<string,CategoryId|null>={}):boolean {
 return !filter||(Object.hasOwn(overrides,projectId)?overrides[projectId]:BUILTIN_CATEGORIES[projectId])===filter;
}

export function togglePdfGrid(view:View):void{
 const l=view.history[view.cursor];if(!l)return;
 if(l.pdfMode==='grid'){l.pdfMode=l.previousGridMode??'single';l.zoom=l.previousGridZoom??1;delete l.previousGridMode;delete l.previousGridZoom;}
 else {l.previousGridMode=l.pdfMode;l.previousGridZoom=l.zoom;l.pdfMode='grid';l.zoom=1;}
}
