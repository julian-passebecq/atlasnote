import type {HistoryData,ResourceRevision} from '../history/model.js';
import type {Asset} from '../core/model.js';
import type {VerifiedArchive,RevisionIdentity} from './model.js';
import {sameDescriptor} from './descriptor.mjs';
import {verifyHistoryArchive,assertArchiveAttachment} from './archive.mjs';
/** Ephemeral verified attachment cache. Never merged into the durable live history. */
const attached=new Map<string,VerifiedArchive>();
const listeners=new Set<()=>void>();let epoch=0;
function changed(){epoch++;listeners.forEach(fn=>fn());}
export const subscribeArchives=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const archiveAttachmentEpoch=()=>epoch;
/** Diagnostic only: retained archive subscribers (V3 resolver lifecycle gate). */
export const archiveListenerCount=()=>listeners.size;
/** V3 staged boot: until the full history store is hydrated, a revision that is
 * not in the shell read is 'still loading', never reported as missing. */
let historyComplete=true;
export function setHistoryComplete(value:boolean){historyComplete=value;}
export const isHistoryComplete=()=>historyComplete;
export async function attachArchive(input:File|Uint8Array,history:HistoryData){const archive=await verifyHistoryArchive(input);assertArchiveAttachment(history,archive);attached.set(archive.descriptor.archiveId,archive as VerifiedArchive);changed();return structuredClone(archive.descriptor);}
export function detachArchive(archiveId:string){if(attached.delete(archiveId))changed();}
export function clearArchiveAttachments(){attached.clear();changed();}
export function isArchiveAttached(history:HistoryData|undefined,archiveId:string){const descriptor=history?.archives?.find(a=>a.archiveId===archiveId);const cached=attached.get(archiveId);return !!descriptor&&!!cached&&sameDescriptor(cached.descriptor,descriptor);}
export function archiveForRevision(history:HistoryData|undefined,id:string){return history?.archives?.find(a=>a.ranges.some(range=>range.revisions.some(r=>r.revisionId===id)));}
export function historicalRevision(history:HistoryData|undefined,id:string):ResourceRevision|undefined{
 const live=history?.revisions.find(r=>r.revisionId===id);if(live)return live;
 const owner=archiveForRevision(history,id),archive=owner&&attached.get(owner.archiveId);
 const revision=owner&&archive&&sameDescriptor(archive.descriptor,owner)?archive.revisions.find(r=>r.revisionId===id):undefined;return revision?structuredClone(revision):undefined;
}
export function requireHistoricalRevision(history:HistoryData|undefined,id:string):ResourceRevision{
 const r=historicalRevision(history,id);if(r)return r;
 if(!historyComplete)throw Error('Version history is still loading. Try again in a moment.');
 const owner=archiveForRevision(history,id);if(owner)throw Error('This version requires archive '+owner.archiveId+' (root '+owner.rootHash+'). Attach the exact archive. Current content was not substituted.');
 throw Error('This historical revision is missing. Import its full backup; current content was not substituted.');
}
export function revisionIdentities(history?:HistoryData):RevisionIdentity[]{
 const result:RevisionIdentity[]=[...(history?.revisions??[])];
 for(const descriptor of history?.archives??[]){const archive=attached.get(descriptor.archiveId),valid=archive&&sameDescriptor(archive.descriptor,descriptor),byId=new Map(valid?archive.revisions.map(r=>[r.revisionId,r]):[]);for(const range of descriptor.ranges)for(const row of range.revisions)result.push(structuredClone(byId.get(row.revisionId)??row));}
 return result;
}
export function archivedAsset(history:HistoryData|undefined,key:string):Asset|undefined {
 for(const descriptor of history?.archives??[]){const archive=attached.get(descriptor.archiveId);if(!archive||!sameDescriptor(archive.descriptor,descriptor))continue;const asset=archive.assets.find(a=>a.key===key);if(asset)return structuredClone(asset);}return undefined;
}
export function attachedPayload(history:HistoryData|undefined,archiveId:string):Uint8Array|undefined {return isArchiveAttached(history,archiveId)?new Uint8Array(attached.get(archiveId)!.bytes):undefined;}
export function attachmentBytes(){return [...attached.values()].reduce((n,a)=>n+a.bytes.length,0);}
