import {store,rawRecovery} from '../storage/database.js';
import type {Workspace} from '../core/model.js';

/** A last-resort PRIVATE diagnostic, not an automatically restorable backup.
 * Freeze memory before touching IndexedDB: validation/capacity/disk failures must
 * never discard unsaved content or make the last persisted snapshot look current.
 * In particular this intentionally does not synthesize revisions or await flush.
 */
export async function captureEmergencyRecovery(timeoutMs=2000){
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1)throw Error('Invalid emergency read timeout.');
 if(typeof document!=='undefined')document.dispatchEvent(new Event('atlas:before-reader-change'));
 const inMemory:Workspace=structuredClone(store.state);
 const persistence={status:store.error?'unsaved':store.saving?'pending':'saved',pendingWrites:store.saving,storageError:store.error||null};
 let timer:ReturnType<typeof setTimeout>|undefined;
 let persisted:Awaited<ReturnType<typeof rawRecovery>>|null=null,persistedReadError:string|null=null;
 try{
  persisted=await Promise.race([rawRecovery(),new Promise<never>((_resolve,reject)=>{timer=setTimeout(()=>reject(Error('Persisted read timed out; unsaved in-memory state was still captured.')),timeoutMs);})]);
 }catch(error){persistedReadError=String((error as Error)?.message??error);}finally{if(timer!==undefined)clearTimeout(timer);}
 return {format:'atlasnote-emergency-recovery',schemaVersion:1,createdAt:Date.now(),
  warning:'PRIVATE emergency diagnostic. inMemory may contain UNSAVED changes; persisted is a separate read of IndexedDB, not a guarantee of saving. This JSON is not a verified workspace backup and is not accepted by Restore.',
  persistence,persistedReadError,inMemory,persisted};
}
