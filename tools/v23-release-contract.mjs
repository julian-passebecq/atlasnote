/** Closed-world release checklist. A missing, skipped or blocked gate is not green. */
export const BASE_COMMIT='84b8ba2addbfe3cb2527dc4a57039416ceabbb52';
export const BASE_TREE='19eadf07aa7485d5d07cb8bfabb22e02539940be';
export const V23_GATES=Object.freeze(['typecheck','check:access','test:v23','check:v23:build','test:v23:runtime','test:v23:layout','test:v23:compare','test:v23:recovery','test:v23:safe-close','test:v23:compaction','test:v23:capacity','test:v23:access:preview','check:v23:secrets']);
export const COMPACTION_FAULTS=Object.freeze(['stale-source-epoch','stale-history-hash','stale-preview-hash','second-tab-history-write','concurrent-personal-write','concurrent-imports-write','concurrent-assets-write','abort-during-descriptor-write','descriptor-put-failure','revision-delete-failure','closed-review-delete-failure','asset-delete-failure','transaction-quota-failure']);
export const CAPACITY_BOUNDARIES=Object.freeze(['2000-revisions-per-resource','25000-total-revisions','500-review-rows','64-MiB-structured-history']);
export const PROVIDER_CASES=Object.freeze(['all-paths-missing-verifier','malformed-runtime-config','handler-error-fail-closed','get-unlock-lock','cross-origin-unlock-lock','wrong-key-generic','provider-rate-limit','valid-key-303-cookie-flags','same-profile-reload','fresh-profile-locked','tampered-cookie','expired-cookie','duplicate-cookie','verifier-rotation','authenticated-cache-then-anonymous','logout-only-cookie-idb-preserved','all-static-and-spa-paths','three-functions-recognized','provider-rate-rule-recognized','disposable-config-cleanup']);
export function releaseStatus(rows,required=V23_GATES){
 if(!Array.isArray(rows)||rows.length!==required.length)return 'BLOCKED';
 const ids=new Set(rows.map(r=>r.id));
 return ids.size===required.length&&required.every(id=>ids.has(id))&&rows.every(r=>r.status==='PASS'&&r.exitCode===0&&!r.signal)?'READY FOR COORDINATOR QA':'BLOCKED';
}
