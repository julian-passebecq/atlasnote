import type {Workspace,Catalogue} from '../core/model.js';
import type {HistoryData,RevisionContext,ResourceRevision,CapturedResource} from './model.js';
import {emptyHistory} from './model.js';
import {captureResources,resourceAdapters} from './adapters.js';
import {validateHistory,HISTORY_LIMITS} from './validation.mjs';
import {sha256,stable} from '../core/validation.mjs';
import {uid,compose} from '../core/workspace.js';
export async function advanceHistory(previous:HistoryData|undefined,resources:CapturedResource[],context:RevisionContext,initialize=false):Promise<HistoryData>{
 const h:HistoryData=structuredClone(previous??emptyHistory()),heads=new Map(h.heads.map(x=>[x.resourceKey,x]));let changed=false;
 for(const r of resources){const a=resourceAdapters[r.resourceType];a.validate(r.snapshot);const contentHash=await a.fingerprint(r.snapshot),old=heads.get(r.resourceKey);
  if(old?.contentHash===contentHash&&context.forceResourceKey!==r.resourceKey&&!context.forceResourceKeys?.includes(r.resourceKey))continue;
  if(h.revisions.length>=HISTORY_LIMITS.totalRevisions||(old?.number??0)-(h.archives??[]).flatMap(a=>a.ranges).filter(range=>range.resourceKey===r.resourceKey).reduce((n,range)=>n+range.revisions.length,0)>=HISTORY_LIMITS.perResource)throw Error('Version history is full. Export a full backup and manage history; no revisions were deleted.');
  const revision:ResourceRevision={kind:'revision',schemaVersion:1,revisionId:uid('revision'),resourceKey:r.resourceKey,resourceId:r.resourceId,resourceType:r.resourceType,number:(old?.number??0)+1,parentRevisionId:old?.revisionId??null,createdAt:Date.now(),source:context.source,summary:context.summary??(old?'Edit '+a.summarize(r.snapshot):'Initial '+a.summarize(r.snapshot)),status:'committed',contentHash,snapshot:structuredClone(r.snapshot),...(context.sourceDetail?{sourceDetail:context.sourceDetail}:{}),...(context.changeSetId?{changeSetId:context.changeSetId}:{}),...((context.restoredFromRevisions?.[r.resourceKey]??(context.forceResourceKey===r.resourceKey?context.restoredFromRevisionId:undefined))?{restoredFromRevisionId:context.restoredFromRevisions?.[r.resourceKey]??context.restoredFromRevisionId}:{}),...(context.derivedFromRevisionId&&context.forceResourceKey===r.resourceKey?{derivedFromRevisionId:context.derivedFromRevisionId}:{})};
  h.revisions.push(revision);heads.set(r.resourceKey,{kind:'head',schemaVersion:1,resourceKey:r.resourceKey,revisionId:revision.revisionId,number:revision.number,contentHash});changed=true;
 }
 h.heads=[...heads.values()];if(initialize&&!h.meta.initialized){h.meta.initialized=true;changed=true;}if(changed)h.meta.epoch++;
 if(new TextEncoder().encode(JSON.stringify(h)).length>HISTORY_LIMITS.bytes)throw Error('Structured history has reached 64 MiB. Export/manage history before making another change. Nothing was pruned.');return h;
}
export async function assertProjection(c:Catalogue,ws:Workspace){
 if(!ws.history)return;const resources=captureResources(c,ws);for(const resource of resources){const head=ws.history.heads.find(h=>h.resourceKey===resource.resourceKey);if(!head||head.contentHash!==await sha256(stable(resource.snapshot)))throw Error('Current content/history head mismatch: '+resource.resourceKey);}
}
export async function prepareWorkspaceHistory(built:any,ws:Workspace,context:RevisionContext,initialize=true){const h=await advanceHistory(ws.history,captureResources(compose(built,ws),ws),context,initialize);return {...ws,history:h};}

/** Emergency exports repair only the copied projection: failed browser writes
 * must not produce a backup that its own restore validator cannot accept. */
export async function prepareEmergencySnapshot(built:any,ws:Workspace){
 await validateHistory(ws.history);
 const ready=await prepareWorkspaceHistory(built,structuredClone(ws),{source:'manual',summary:'Recovered unsaved content in an emergency backup',sourceDetail:'Backup-only revision; the browser write failed. The original live history was not rewritten.'});
 await assertProjection(compose(built,ready),ready);return ready;
}
