import {verifyHistoryArchive,planCompaction} from './archive.mjs';
import {captureResources} from '../history/adapters.js';
import {compose} from '../core/workspace.js';
import type {Workspace,Asset} from '../core/model.js';
import type {VerifiedArchive} from './model.js';
import {captureRawDatabaseState,workspaceFromStoredRecords} from '../storage/database.js';
// Receipts are unforgeable object identities, session-only, single-use, never serialized.
const receipts=new WeakMap<object,{archive:VerifiedArchive;previewHash:string;raw:Awaited<ReturnType<typeof captureRawDatabaseState>>}>();
export async function selectSavedArchive(event:Event,candidate:VerifiedArchive,workspace:Workspace,built:any,resolveAsset:(key:string)=>Promise<Asset|undefined>){
 if(!(event instanceof Event)||!event.isTrusted||!(event.target instanceof HTMLInputElement)||event.target.type!=='file'||event.target.files?.length!==1)throw Error('Re-select the actual saved archive using the file chooser.');
 const file=event.target.files[0],archive=await verifyHistoryArchive(file,candidate) as VerifiedArchive;
 // Bind authorization to one exact persisted five-store snapshot, not merely the
 // in-memory workspace. Any later tab/write difference forces a fresh ceremony.
 const raw=await captureRawDatabaseState(),persisted=workspaceFromStoredRecords(raw);
 const plan=await planCompaction(persisted,archive,built.packs,captureResources(compose(built,persisted),persisted),resolveAsset);
 const ticket=Object.freeze({});receipts.set(ticket,{archive,previewHash:plan.previewHash,raw});
 return {ticket,preview:plan.preview};
}
export function discardSavedSelection(ticket:object|undefined){if(ticket)receipts.delete(ticket);}
export function consumeSavedSelection(ticket:object,event:Event){
 if(!(event instanceof Event)||!event.isTrusted||event.type!=='click'||!(event.target instanceof Element)||!event.target.closest('button[data-archive-commit]'))throw Error('Explicit confirmation in the archive dialog is required.');
 const value=receipts.get(ticket);receipts.delete(ticket);if(!value)throw Error('A saved archive must be independently re-selected and verified before compaction.');return value;
}
