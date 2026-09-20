/** Closed-world release checklist. A missing, skipped or blocked gate is not green. */
export const BASE_COMMIT='2ece94b4e07e3179e8aee5dad4b32970c5be2242';
export const BASE_TREE='1a57e4db16efaf1ee4ac25f52da0462e388c93e9';
export const V23_GATES=Object.freeze(['typecheck','check:access','test:v23','check:v23:build','test:v23:runtime','test:v23:layout','test:v23:compare','test:v23:recovery','test:v23:safe-close','test:v23:compaction','test:v23:capacity','test:v23:access:preview','check:v23:secrets']);
export const COMPACTION_FAULTS=Object.freeze(['stale-source-epoch','stale-history-hash','stale-preview-hash','second-tab-history-write','concurrent-personal-write','concurrent-imports-write','concurrent-assets-write','abort-during-descriptor-write','descriptor-put-failure','revision-delete-failure','closed-review-delete-failure','asset-delete-failure','transaction-quota-failure']);
export const CAPACITY_BOUNDARIES=Object.freeze(['2000-revisions-per-resource','25000-total-revisions','500-review-rows','64-MiB-structured-history']);
export const PROVIDER_CASES=Object.freeze(["ready-preview", "exact-build", "anonymous-root", "anonymous-static", "anonymous-deep-link", "authorized-root", "authorized-deep-link", "security-headers", "cache-isolation", "auth-state-idb", "automation-secret-scope", "fail-closed-protection", "browser-sanity"]);
export function releaseStatus(rows,required=V23_GATES){
 if(!Array.isArray(rows)||rows.length!==required.length)return 'BLOCKED';
 const ids=new Set(rows.map(r=>r.id));
 return ids.size===required.length&&required.every(id=>ids.has(id))&&rows.every(r=>r.status==='PASS'&&r.exitCode===0&&!r.signal)?'READY FOR COORDINATOR QA':'BLOCKED';
}
