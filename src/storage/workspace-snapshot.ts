import {store,loadWorkspace} from './database.js';
import type {Workspace} from '../core/model.js';
/** Production flush point shared by Backup and read-only persistence diagnostics.
 * Flush source anchors before waiting for IndexedDB, then freeze the exact state.
 * No meaningful personal/session fields are omitted or reinterpreted. */
export async function captureWorkspaceSnapshot():Promise<Workspace>{
 if(typeof document!=='undefined')document.dispatchEvent(new Event('atlas:before-reader-change'));
 await store.flush();
 // A failed durable write must not prevent an emergency copy of unsaved
 // in-memory work. Diagnostics compare this snapshot to persisted data
 // separately; the Settings UI explicitly discloses a storage failure.
 return store.backupSnapshot();
}
/** Read persisted data without exposing the mutation store in the hosted bundle. */
export async function readPersistedWorkspace():Promise<Workspace>{return loadWorkspace();}
