import {HISTORY_LIMITS} from '../history/validation.mjs';
/** Browser estimates are advisory, origin-wide and may change before any write. */
export async function storageHealth(storage = globalThis.navigator?.storage) {
 const result={estimate:{status:'unsupported',usage:null,quota:null,available:null},persistence:{status:'unsupported',persisted:null}};
 if(storage?.estimate){try{const e=await storage.estimate();if(Number.isFinite(e.usage)&&e.usage>=0&&Number.isFinite(e.quota)&&e.quota>0)result.estimate={status:'available',usage:e.usage,quota:e.quota,available:Math.max(0,e.quota-e.usage)};else result.estimate.status='unavailable';}catch{result.estimate.status='failed';}}
 if(storage?.persisted){try{const persisted=await storage.persisted();result.persistence={status:persisted?'persistent':'best-effort',persisted:!!persisted};}catch{result.persistence.status='failed';}}
 return result;
}
export async function requestPersistence(storage = globalThis.navigator?.storage) {
 if(!storage?.persist)return {status:'unsupported',persisted:null};
 try {if(storage.persisted&&await storage.persisted())return {status:'already-persistent',persisted:true};const persisted=await storage.persist();return {status:persisted?'granted':'denied',persisted:!!persisted};}catch{return {status:'failed',persisted:null};}
}
export function capacityLevel(ratio){return ratio>=.95?'critical':ratio>=.85?'high':ratio>=.70?'watch':'healthy';}
export function historyCapacity(history) {
 const h=history??{revisions:[],reviews:[]},bytes=new TextEncoder().encode(JSON.stringify(h)).length,groups=new Map();for(const r of h.revisions)groups.set(r.resourceKey,(groups.get(r.resourceKey)??0)+1);
 const values=[{name:'Live revisions',used:h.revisions.length,limit:HISTORY_LIMITS.totalRevisions},{name:'Largest live resource chain',used:Math.max(0,...groups.values()),limit:HISTORY_LIMITS.perResource},{name:'Live structured history bytes (including archive index)',used:bytes,limit:HISTORY_LIMITS.bytes},{name:'Live review records',used:h.reviews.length,limit:HISTORY_LIMITS.reviewRecords},{name:'Pending reviews',used:h.reviews.filter(r=>r.status==='staged').length,limit:HISTORY_LIMITS.drafts}];
 return values.map(value=>({...value,ratio:value.used/value.limit,level:capacityLevel(value.used/value.limit)}));
}
export async function preflightStorage(incomingBytes,storage=globalThis.navigator?.storage) {
 if(!Number.isSafeInteger(incomingBytes)||incomingBytes<0)throw Error('Invalid import byte estimate.');
 const {estimate}=await storageHealth(storage),required=Math.ceil(incomingBytes*1.25)+4*1024*1024;
 if(estimate.status==='available'&&required>estimate.available)throw Error('Insufficient estimated browser storage for this operation (including a 25% + 4 MiB safety margin). Export/verify an archive or backup and free capacity first. Nothing was imported.');
 return {status:estimate.status==='available'?'estimated-enough':'unknown',incomingBytes,required,available:estimate.available,warning:'An estimate is not a reservation. The actual IndexedDB transaction can still fail without a partial commit.'};
}
export function workspaceImportBytes(imports,assets,overlays){return new TextEncoder().encode(JSON.stringify({imports,overlays})).length+assets.reduce((n,a)=>n+a.bytes.length,0);}
