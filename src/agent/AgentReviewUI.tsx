import React, {useEffect, useRef, useState} from '../vendor/react.mjs';
import {Modal} from '../components/Modal.js';
import {getAgentInterface} from './service.js';
import type {AgentInterface} from './service.js';
import type {AgentChangeSet} from './model.js';
import {ChangeList} from '../history/HistoryUI.js';
import {downloadJSON} from '../content-hub/content.js';
import type {Workspace} from '../core/model.js';
import {planNorskDailyImport,lookupFromAgent} from '../norsk-daily/import.js';
import {buildTransformationPrompt,norskDailyJsonSchema} from '../norsk-daily/contract.js';
import {NORSK_DAILY_LIMITS} from '../norsk-daily/validation.mjs';

type Preview = ReturnType<AgentInterface['preview']>;
const sameSelection = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));
/** Only human clicks on the decision controls call accept/reject. Importing,
 * editing or inspecting a proposal never applies it. No provider is embedded. */
export function AgentReviewDialog({workspace, resourceKey, onClose, initialChangeSet, initialStatus}: {workspace: Workspace; resourceKey?: string; onClose: () => void; initialChangeSet?: AgentChangeSet; initialStatus?: string}) {
 const api = getAgentInterface();
 const [text, setText] = useState(''), [plan, setPlan] = useState<AgentChangeSet | undefined>(undefined);
 const [preview, setPreview] = useState<Preview | undefined>(undefined), [selected, setSelected] = useState<string[]>([]);
 const [error, setError] = useState(''), [status, setStatus] = useState(''), [busy, setBusy] = useState(false);
 const [includePersonal, setIncludePersonal] = useState(false), [reviewOffset, setReviewOffset] = useState(0);
 const [activeId, setActiveId] = useState<string | undefined>(undefined), inFlight = useRef(false);
 const [contextKeys, setContextKeys] = useState<string[]>(resourceKey ? [resourceKey] : []);
 const [query, setQuery] = useState(''), [queryOffset, setQueryOffset] = useState(0);
 const reviews = api.getReviews(reviewOffset, 25), active = workspace.history?.reviews.find(review => review.id === activeId);
 const contextResources = api.listResources({query, includeStructures: true, offset: queryOffset, limit: 20});
 const decided = active?.status === 'accepted' || active?.status === 'rejected';
 const previewMatches = !!preview && sameSelection(selected, preview.operations.map(operation => operation.id));
 function close() { if (!inFlight.current) onClose(); }
 async function run(fn: () => unknown | Promise<unknown>, closeAfter = false) {
  if (inFlight.current) return;
  inFlight.current = true; setBusy(true); setError('');
  try { await fn(); if (closeAfter) onClose(); }
  catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  finally { inFlight.current = false; setBusy(false); }
 }
 function resetDraft(value: string) {
  setText(value); setPlan(undefined); setPreview(undefined); setSelected([]); setActiveId(undefined); setError(''); setStatus('');
 }
 function inspect(value: unknown, selection?: string[]) {
  // Clear previous results BEFORE validation. An invalid new import must never
  // leave a different proposal's Stage button enabled.
  setPreview(undefined);
  const result = api.preview(value, selection);
  setPlan(result.plan); setPreview(result);
  if (!selection) setSelected(result.operations.map(operation => operation.id));
  return result;
 }
 function loadReview(id: string) {
  if (inFlight.current) return;
  const row = workspace.history?.reviews.find(review => review.id === id);
  if (!row) return;
  setError(''); setStatus(''); setPreview(undefined); setActiveId(id);
  const savedPlan = row.plan as AgentChangeSet;
  setPlan(savedPlan); setText(JSON.stringify(savedPlan, null, 2));
  setSelected(row.selectedOperationIds ?? savedPlan.operations.map(operation => operation.id));
  // An accepted plan has old bases by definition. Inspect its immutable audit
  // rather than incorrectly reporting that successful historical decision stale.
  if (row.status === 'staged') {
   try { inspect(savedPlan); }
   catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  }
 }
 // V3: a caller-prepared proposal (e.g. Norsk Daily vocabulary) is only loaded for
 // inspection; staging and the accept/reject decision remain explicit human clicks.
 useEffect(() => { if (initialChangeSet) { setText(JSON.stringify(initialChangeSet, null, 2)); inspect(initialChangeSet); if (initialStatus) setStatus(initialStatus); } }, []);
 return <Modal title="Agent Review" onClose={close} wide>
  <div className="agent-review" aria-busy={busy}>
   <p className="eyebrow">PROVIDER-NEUTRAL / REVIEW BEFORE APPLYING</p>
   <p>Export bounded context to your chosen tool, then import its typed ChangeSet. Preview is read-only. Stage saves the proposal only; acceptance rechecks live revision identities and commits the selected operations together.</p>
   <div className="button-row">
    <button disabled={busy} data-agent-action="capabilities-export" onClick={() => void run(() => downloadJSON(api.getAgentCapabilities(), 'atlasnote-agent-capabilities.json'))}>Export capabilities</button>
    <button disabled={busy} data-agent-action="context-export" onClick={() => void run(() => downloadJSON(api.getAgentContext({resourceKeys: contextKeys, includeHistory: true, includePersonal}), 'atlasnote-agent-context.json'))}>Export context</button>
    <label className="inline-check"><input type="checkbox" disabled={busy} checked={includePersonal} data-agent-action="context-include-personal" onChange={e => setIncludePersonal(e.target.checked)} />Include personal excerpts</label>
   </div>
   <p className="secondary">{contextKeys.length} selected resources. Personal excerpts are excluded unless selected above. No API key, provider request or remote fetch is performed.</p>
   <details className="agent-context-picker"><summary>Choose context resources (maximum 20)</summary>
    <label className="field">Find a resource<input aria-label="Find context resources" maxLength={500} value={query} disabled={busy} onChange={e => {setQuery(e.target.value); setQueryOffset(0);}} /></label>
    <p>Selected source is included in the local JSON export. Review it before giving it to another tool.</p>
    {contextKeys.length > 0 && <div className="agent-context-selection" aria-label="Selected context resources">{contextKeys.map(key => <button key={key} disabled={busy} data-resource-key={key} data-agent-action="context-remove-resource" onClick={() => setContextKeys(keys => keys.filter(k => k !== key))}>Remove {key}</button>)}</div>}
    <div className="agent-context-results">{contextResources.items.map(resource => <label key={resource.resourceKey} data-resource-key={resource.resourceKey} data-resource-id={resource.resourceId} data-resource-type={resource.resourceType} data-revision-id={resource.head?.revisionId}>
     <input type="checkbox" aria-label={'Include ' + resource.title + ' in context'} checked={contextKeys.includes(resource.resourceKey)} disabled={busy || !contextKeys.includes(resource.resourceKey) && contextKeys.length >= 20} data-agent-action="context-select-resource" onChange={e => setContextKeys(keys => e.target.checked ? [...new Set([...keys, resource.resourceKey])].slice(0, 20) : keys.filter(key => key !== resource.resourceKey))} />
     <span>{resource.title}<small>{resource.resourceType} / {resource.resourceId}</small></span>
    </label>)}</div>
    {!contextResources.total && <p>No matching resources.</p>}
    <div className="button-row"><button disabled={busy || !queryOffset} data-agent-action="context-previous-page" onClick={() => setQueryOffset(offset => Math.max(0, offset - 20))}>Previous resources</button>
     <span>{contextResources.total} resources</span><button disabled={busy || contextResources.nextOffset === null} data-agent-action="context-next-page" onClick={() => setQueryOffset(contextResources.nextOffset!)}>More resources</button></div>
   </details>
   <label className="field"><span>ChangeSet JSON</span><textarea aria-label="ChangeSet JSON" className="json-editor" rows={9} value={text} disabled={busy}
    onChange={e => resetDraft(e.target.value)} placeholder='{"schemaVersion":1,"kind":"atlas-agent-changeset",...}' /></label>
   <div className="button-row">
    <label className="history-file">Import ChangeSet JSON<input type="file" accept=".json,application/json" aria-label="Import ChangeSet JSON" data-agent-action="changeset-import" disabled={busy} onChange={e => {
     const file = e.target.files?.[0]; e.target.value = '';
     if (!file) return;
     resetDraft('');
     void run(async () => {if (file.size > 1024 * 1024) throw Error('ChangeSet exceeds 1 MiB'); const value = await file.text(); setText(value); inspect(value);});
    }} /></label>
    {/* Norsk Daily: a validated feed becomes an ordinary ChangeSet proposal in this
      same dialog. It is only previewed here; staging and accept/reject stay human clicks. */}
    <label className="history-file">Import Norsk Daily feed<input type="file" accept=".json,application/json" aria-label="Import Norsk Daily feed JSON" data-agent-action="norsk-daily-import" disabled={busy} onChange={e => {
     const file = e.target.files?.[0]; e.target.value = '';
     if (!file) return;
     resetDraft('');
     void run(async () => {
      if (file.size > NORSK_DAILY_LIMITS.bytes) throw Error('Norsk Daily feed exceeds ' + NORSK_DAILY_LIMITS.bytes / 1024 + ' KiB');
      const now = Date.now(), result = planNorskDailyImport(await file.text(), lookupFromAgent(api), {createdAt: now, now, changeSetSuffix: now.toString(36)});
      if (result.blocked) throw Error('Norsk Daily import blocked: ' + result.messages.join(' '));
      if (!result.changeSet) { setStatus('Norsk Daily: ' + result.messages[0] + ' Nothing to review.'); return; }
      setText(JSON.stringify(result.changeSet, null, 2)); inspect(result.changeSet);
      setStatus('Norsk Daily feed converted to a proposal: ' + result.messages[0] + ' Review the preview, then stage and explicitly accept or reject.');
     });
    }} /></label>
    <button disabled={busy} data-agent-action="norsk-daily-prompt-export" onClick={() => void run(() => downloadJSON({schemaVersion: 1, kind: 'atlas-norsk-daily-transformation', prompt: buildTransformationPrompt(), schema: norskDailyJsonSchema()}, 'atlasnote-norsk-daily-prompt.json'))}>Export Norsk Daily prompt</button>
    <button disabled={busy || !text || decided || active?.status === 'stale'} data-agent-action="changeset-preview" onClick={() => void run(() => inspect(text))}>Preview ChangeSet</button>
    <button disabled={busy || !preview || !!activeId} data-agent-action="changeset-stage" onClick={() => void run(async () => {
     if (!preview) return;
     await api.stage(preview.plan); setActiveId(preview.plan.id); setReviewOffset(0); setStatus('Proposal staged. Current content has not changed.');
    })}>Stage for review</button>
   </div>
   {error && <p className="history-error" role="alert">{error}</p>}
   {status && <p role="status" className="agent-status">{status}</p>}
   {plan && <section aria-label="Proposed operations" data-changeset-id={plan.id}>
    <h2>{plan.summary ?? 'Proposed changes'}</h2>
    <p>{plan.operations.length} operations in the proposal; {selected.length} selected. Stage retains the full proposal. Only selected operations are applied on acceptance.</p>
    {plan.operations.map(operation => <article key={operation.id} className="agent-operation" data-operation-id={operation.id} data-operation-kind={operation.kind} data-resource-key={operation.resourceKey} data-revision-id={operation.baseRevisionId ?? undefined}>
     <label><input type="checkbox" aria-label={'Select operation ' + operation.id} data-agent-action="changeset-select-operation" checked={selected.includes(operation.id)} disabled={busy || decided || active?.status === 'stale'} onChange={e => setSelected(ids => e.target.checked ? [...ids, operation.id] : ids.filter(id => id !== operation.id))} />
      <span><strong>{operation.kind}</strong><code>{operation.resourceKey ?? 'Personal / workspace state'}</code><small>{operation.rationale}</small></span>
     </label>
     {operation.resourceKey && operation.baseRevisionId && <button disabled={busy} data-agent-action="changeset-compare-base" onClick={() => void run(() => api.compareRevisions(operation.resourceKey!, operation.baseRevisionId!), true)}>Open base / current</button>}
    </article>)}
    {!decided && active?.status !== 'stale' && <div className="button-row"><button disabled={!selected.length || busy} data-agent-action="changeset-preview-selection" onClick={() => void run(() => inspect(plan, selected))}>Preview selection</button></div>}
    {!decided && selected.length > 0 && !previewMatches && <p role="status">Selection changed or preview unavailable. Preview this selection before accepting.</p>}
    {preview && <div data-preview-current={previewMatches}>
     {!previewMatches && <p className="secondary">The changes below belong to the previous selection, not the current checkboxes.</p>}
     {preview.changes.map(change => <details className="agent-change-group" key={change.resourceKey} data-resource-key={change.resourceKey} open><summary>{change.title || change.resourceKey}</summary><ChangeList changes={change.entries ?? []} /></details>)}
     {!preview.changes.length && <p>No authored content will change; this is a draft, personal, semantic-reference or navigation proposal.</p>}
    </div>}
   </section>}
   {active && <div className="agent-decision" data-review-id={active.id} data-review-status={active.status}>
    <strong>{active.id} / {active.status}</strong>{active.reason && <p role="status">{active.reason}</p>}
    {decided && <p>Stored decision. This proposal is not replayed against today's content. Export fresh context and use a new ChangeSet ID for further edits.</p>}
    {active.revisionIds && active.revisionIds.length > 0 && <details><summary>Resulting revisions ({active.revisionIds.length})</summary>{active.revisionIds.map(id => <p key={id} data-revision-id={id}><code>{id}</code></p>)}</details>}
    <div className="button-row">
     <button className="primary" disabled={busy || active.status !== 'staged' || !selected.length || !previewMatches || plan?.id !== active.id} data-agent-action="changeset-accept" onClick={() => void run(async () => {
      await api.accept(active.id, selected); setPreview(undefined); setStatus('Selected operations accepted. Unselected operations were not applied.');
     })}>Accept selected operations</button>
     <button disabled={busy || !['staged', 'stale'].includes(active.status)} data-agent-action="changeset-reject" onClick={() => void run(async () => {
      await api.reject(active.id); setPreview(undefined); setStatus('Proposal rejected. Authored content was not changed.');
     })}>Reject ChangeSet</button>
     <button disabled={busy} data-agent-action="changeset-export-audit" onClick={() => void run(() => downloadJSON({schemaVersion: 1, kind: 'atlas-agent-review-export', review: active}, active.id + '-review.json'))}>Export review record</button>
    </div>
   </div>}
   <section className="agent-audit"><h2>Review history</h2>
    {reviews.items.map(row => <button key={row.id} disabled={busy} data-review-id={row.id} data-review-status={row.status} data-agent-action="changeset-inspect" onClick={() => loadReview(row.id)}><strong>{row.id}</strong><span>{row.status}</span><time dateTime={new Date(row.createdAt).toISOString()}>{new Date(row.createdAt).toLocaleString()}</time></button>)}
    {!reviews.total && <p>No staged proposals. Only accepted content operations advance resource heads.</p>}
    <div className="button-row"><button disabled={busy || !reviewOffset} data-agent-action="reviews-newer" onClick={() => setReviewOffset(offset => Math.max(0, offset - 25))}>Newer reviews</button><button disabled={busy || reviewOffset + 25 >= reviews.total} data-agent-action="reviews-older" onClick={() => setReviewOffset(offset => offset + 25)}>Older reviews</button></div>
   </section>
  </div>
 </Modal>;
}
