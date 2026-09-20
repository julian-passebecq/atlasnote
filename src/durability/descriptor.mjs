import {ID, safePath, stable} from '../core/validation.mjs';
// Intentionally independent of history/validation to avoid validator dependency cycles.
const TYPES = ['notebook-page', 'notebook-tree', 'article', 'cheatsheet', 'qcm', 'pdf'];
const REVISION_KEYS = ['kind','schemaVersion','revisionId','resourceKey','resourceId','resourceType','number','parentRevisionId','createdAt','source','summary','status','contentHash','restoredFromRevisionId','derivedFromRevisionId','sourceDetail','changeSetId'];
export const ARCHIVE_LIMITS = Object.freeze({descriptors:256, revisions:25000, bytes:64*1024*1024});
export function keys(value, allowed, label) {
 if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value)) || Object.keys(value).some(k => !allowed.includes(k))) throw Error('Invalid ' + label + ' fields');
}
export function isHash(value) { return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value); }
export function validId(value) { return typeof value === 'string' && ID.test(value); }
function count(value, min = 0) { return Number.isSafeInteger(value) && value >= min; }
export function validateBuildIdentity(p) {
 keys(p,['appVersion','sourceCommit','sourceHash','sourceDirty','databaseVersion','pdfAtlasCommit','buildKind'],'artifact provenance');
 if (typeof p.appVersion !== 'string' || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(p.appVersion) || !/^[a-f0-9]{40}$/.test(p.sourceCommit) || !isHash(p.sourceHash) || typeof p.sourceDirty !== 'boolean' || p.databaseVersion !== 3 || !/^[a-f0-9]{40}$/.test(p.pdfAtlasCommit) || !['integrated','compatibility'].includes(p.buildKind)) throw Error('Invalid exact build provenance');
 return p;
}
export function revisionIdentity({snapshot, ...r}) { return structuredClone(r); }
export function validateRevisionIdentity(r) {
 keys(r,REVISION_KEYS,'archived revision identity');
 if(r.kind!=='revision'||r.schemaVersion!==1||r.status!=='committed'||!validId(r.revisionId)||!validId(r.resourceId)||!TYPES.includes(r.resourceType)||r.resourceKey!==r.resourceType+':'+r.resourceId||!count(r.number,1)||!count(r.createdAt)||r.createdAt>8640000000000000||r.parentRevisionId!==null&&!validId(r.parentRevisionId)||!isHash(r.contentHash)||!['manual','ai','import','restore','migration','system'].includes(r.source)||typeof r.summary!=='string'||r.summary.length>2000) throw Error('Invalid archived revision identity');
 for(const field of ['restoredFromRevisionId','derivedFromRevisionId','changeSetId']) if(r[field]!==undefined&&!validId(r[field]))throw Error('Invalid archived provenance identity');
 if(r.sourceDetail!==undefined&&(typeof r.sourceDetail!=='string'||r.sourceDetail.length>4000))throw Error('Invalid archived source detail');
 return r;
}
export function validateDescriptor(d) {
 keys(d,['kind','schemaVersion','archiveSchema','archiveId','rootHash','createdAt','provenance','sourceEpoch','sourceHistoryHash','ranges','assets','reviews','counts'],'archive descriptor');
 if(d.kind!=='archive'||d.schemaVersion!==1||d.archiveSchema!==1||!validId(d.archiveId)||!isHash(d.rootHash)||!isHash(d.sourceHistoryHash)||!count(d.createdAt)||d.createdAt>8640000000000000||!count(d.sourceEpoch)||!Array.isArray(d.ranges)||!Array.isArray(d.assets)||!Array.isArray(d.reviews))throw Error('Invalid archive descriptor');
 validateBuildIdentity(d.provenance);
 const ids=new Set(), resources=new Set();let revisionCount=0;
 for(const range of d.ranges){
  keys(range,['resourceKey','previous','revisions'],'archive range');
  if(resources.has(range.resourceKey)||!Array.isArray(range.revisions)||!range.revisions.length)throw Error('Invalid/duplicate archive range');resources.add(range.resourceKey);
  range.revisions.forEach((r,i)=>{validateRevisionIdentity(r);if(ids.has(r.revisionId)||r.resourceKey!==range.resourceKey)throw Error('Ambiguous archive revision ownership');ids.add(r.revisionId);if(i&&(r.number!==range.revisions[i-1].number+1||r.parentRevisionId!==range.revisions[i-1].revisionId))throw Error('Archive range is not contiguous');});
  const first=range.revisions[0],previous=range.previous;
  if(first.number===1){if(previous!==null||first.parentRevisionId!==null)throw Error('Invalid first archive boundary');}
  else {keys(previous,['archiveId','rootHash','lastRevisionId','lastNumber'],'prior archive boundary');if(!validId(previous.archiveId)||previous.archiveId===d.archiveId||!isHash(previous.rootHash)||previous.lastNumber!==first.number-1||previous.lastRevisionId!==first.parentRevisionId)throw Error('Invalid archive boundary continuity');}
  revisionCount+=range.revisions.length;
 }
 const assetKeys=new Set(),paths=new Set();let assetBytes=0;
 for(const a of d.assets){keys(a,['key','sha256','mediaType','bytes','path'],'archived asset');safePath(a.key);safePath(a.path);if(assetKeys.has(a.key)||paths.has(a.path.toLowerCase())||!/^assets\/\d{5}\.(pdf|svg|png|jpg|webp|txt)$/.test(a.path)||!isHash(a.sha256)||!count(a.bytes,1)||typeof a.mediaType!=='string'||a.mediaType.length>120)throw Error('Invalid archive asset binding');assetKeys.add(a.key);paths.add(a.path.toLowerCase());assetBytes+=a.bytes;}
 const reviews=new Set();for(const row of d.reviews){keys(row,['kind','schemaVersion','id','status','createdAt','decidedAt','revisionIds'],'archive audit identity');if(row.kind!=='review'||row.schemaVersion!==1||!validId(row.id)||reviews.has(row.id)||!['accepted','rejected','stale'].includes(row.status)||!count(row.createdAt)||!count(row.decidedAt)||row.decidedAt<row.createdAt||row.revisionIds!==undefined&&(!Array.isArray(row.revisionIds)||row.revisionIds.some(id=>!ids.has(id))))throw Error('Invalid archived audit identity');reviews.add(row.id);}
 keys(d.counts,['revisions','reviews','assets','assetBytes','structuredBytes'],'archive counts');
 if(d.counts.revisions!==revisionCount||revisionCount>ARCHIVE_LIMITS.revisions||d.counts.reviews!==d.reviews.length||d.counts.assets!==d.assets.length||d.counts.assetBytes!==assetBytes||!count(d.counts.structuredBytes)||d.counts.structuredBytes>ARCHIVE_LIMITS.bytes||!revisionCount&&!d.reviews.length)throw Error('Archive count/byte mismatch');
 return d;
}
/** All removed identities remain exact and non-overlapping; the live tail follows them. */
export function descriptorIndex(descriptors = []) {
 if(!Array.isArray(descriptors)||descriptors.length>ARCHIVE_LIMITS.descriptors)throw Error('Archive descriptor limit');
 const archives=new Map(),revisions=new Map(),groups=new Map(),reviews=new Map();
 for(const descriptor of descriptors){validateDescriptor(descriptor);if(archives.has(descriptor.archiveId))throw Error('Duplicate archive ID');archives.set(descriptor.archiveId,descriptor);
  for(const range of descriptor.ranges){const rows=groups.get(range.resourceKey)??[];for(const r of range.revisions){if(revisions.has(r.revisionId))throw Error('Overlapping archive ownership');revisions.set(r.revisionId,{...r,archiveId:descriptor.archiveId});rows.push(r);}groups.set(range.resourceKey,rows);}
  for(const row of descriptor.reviews){if(reviews.has(row.id))throw Error('Duplicate archived review identity');reviews.set(row.id,{...row,archiveId:descriptor.archiveId});}
 }
 for(const rows of groups.values()){rows.sort((a,b)=>a.number-b.number);rows.forEach((r,i)=>{if(r.number!==i+1||r.parentRevisionId!==(i?rows[i-1].revisionId:null))throw Error('Archive prefix has a gap/overlap');});}
 for(const d of descriptors)for(const range of d.ranges)if(range.previous){const prev=archives.get(range.previous.archiveId),pr=prev?.ranges.find(r=>r.resourceKey===range.resourceKey)?.revisions.at(-1);if(!prev||prev.rootHash!==range.previous.rootHash||pr?.revisionId!==range.previous.lastRevisionId||pr?.number!==range.previous.lastNumber)throw Error('Missing/mismatched prior archive descriptor');}
 return {archives,revisions,groups,reviews};
}
export function sameDescriptor(a,b) { return stable(a) === stable(b); }
