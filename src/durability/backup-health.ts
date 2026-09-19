/** Disposable local health metadata, not content or evidence of permanent retention.
 * Read-only artifact validators do not call this module. */
const KEY='atlasnote.backup-health.v1';
export function readBackupHealth(){try{const value=JSON.parse(localStorage.getItem(KEY)??'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch{return {};}}
export function recordBackupHealth(kind:'generated'|'reselected',summary:any,epoch:number){const previous=readBackupHealth();const safe={at:Date.now(),artifactId:summary.artifactId,fileHash:summary.fileHash,rootHash:summary.rootHash,schema:summary.schema,recoverySchema:summary.recoverySchema??null,artifactCreatedAt:summary.createdAt,epoch,archives:(summary.archiveDependencies??[]).map(a=>({archiveId:a.archiveId,rootHash:a.rootHash}))};try{localStorage.setItem(KEY,JSON.stringify({...previous,[kind]:safe}));return true;}catch{return false;}}
