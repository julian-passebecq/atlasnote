import {ArchiveManager} from '../durability/ArchiveManager.js';
import {subscribeArchives,archiveAttachmentEpoch,archiveForRevision,isArchiveAttached} from '../durability/registry.js';
import React, {useMemo, useRef, useState, useSyncExternalStore} from '../vendor/react.mjs';
import {Modal} from '../components/Modal.js';
import {downloadJSON} from '../content-hub/content.js';
import {getAgentInterface} from '../agent/service.js';
import {restoreAsNewRevision} from './actions.js';
import {resourceAdapters, resourceKeyForTarget, historicalCatalogue, captureResources} from './adapters.js';
import {createHistoryIndex} from './ui-context.js';
import {semanticDiff} from './diff.js';
import type {DiffEntry} from './diff.js';
import {current} from '../core/workspace.js';
import {currentResourceTarget} from '../content-hub/content.js';
import type {Catalogue, Workspace, Session} from '../core/model.js';
import type {ReadingDestination} from '../core/reading-types.js';

const stringify = (value: unknown): string => typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? '(absent)';
function summary(value: unknown): string {
 if (value === undefined) return '(absent)';
 if (value === null || typeof value !== 'object') return String(value).slice(0, 1600);
 if (Array.isArray(value)) return value.length + ' items';
 const object = value as Record<string, unknown>;
 const label = ['title', 'label', 'prompt', 'text', 'id'].map(k => object[k]).find(v => typeof v === 'string');
 return typeof label === 'string' ? label.slice(0, 1600) : 'Structured value (' + Object.keys(object).length + ' fields)';
}
/** Human-readable changes first; raw structured values remain an explicit detail.
 * Rendering is bounded and escaped. Full source is available through version export. */
export function ChangeList({changes}: {changes: DiffEntry[]}) {
 const [limit, setLimit] = useState(60);
 return <div className="semantic-changes">
  {!changes.length && <p className="empty-state">No authored-content differences.</p>}
  {changes.slice(0, limit).map((change, index) => <article className={'semantic-change change-' + change.kind}
   key={change.path + ':' + index} data-change-kind={change.kind} data-entity-id={change.entityId}>
   <header><strong>{change.kind}</strong><span>{change.entityType}{change.entityId ? ' / ' + change.entityId : ''}</span></header>
   <code>{change.path}</code>
   {change.words ? <>
    <p className="word-change">{change.words.map((word, i) => word.kind === 'remove' ? <del key={i}>{word.text.slice(0, 8000)}</del>
     : word.kind === 'add' ? <ins key={i}>{word.text.slice(0, 8000)}</ins> : <span key={i}>{word.text.slice(0, 8000)}</span>)}</p>
    {change.words.some(word => word.text.length > 8000) && <p className="secondary">Long text is abbreviated here. Export the versions for complete source.</p>}
   </> : <div className="change-values change-summary"><div><small>A / before</small><p>{summary(change.before)}</p></div><div><small>B / after</small><p>{summary(change.after)}</p></div></div>}
   <details className="change-advanced"><summary>Inspect structured before / after</summary>
    <div className="change-values"><div><small>A / before</small><pre>{stringify(change.before).slice(0, 12000)}</pre></div><div><small>B / after</small><pre>{stringify(change.after).slice(0, 12000)}</pre></div></div>
    {(stringify(change.before).length > 12000 || stringify(change.after).length > 12000) && <small>Preview capped at 12,000 characters per value; exports retain complete source.</small>}
   </details>
  </article>)}
  {changes.length > limit && <button data-agent-action="changes-more" onClick={() => setLimit(n => n + 60)}>Show more changes ({changes.length - limit} remaining)</button>}
 </div>;
}

type HistoryProps = {built: any; assets:any; workspace: Workspace; resourceKey: string; onClose: () => void; notify: (text: string, error?: boolean) => void};
type RestoreConfirmation = {revisionId: string; expectedHead: string};
export function HistoryPanel({built, assets, workspace, resourceKey, onClose, notify}: HistoryProps) {
 const api = getAgentInterface();
 const [offset, setOffset] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('');
 const inFlight = useRef(false);
 const [confirm, setConfirm] = useState<RestoreConfirmation | undefined>(undefined);
 const [destination, setDestination] = useState<ReadingDestination>('here');
 const [compareA, setCompareA] = useState<string | undefined>(undefined), [compareB, setCompareB] = useState<string | undefined>(undefined);
 const [manualLink, setManualLink] = useState('');
 const archiveEpoch=useSyncExternalStore(subscribeArchives,archiveAttachmentEpoch);
 const index = useMemo(() => createHistoryIndex(workspace.history), [workspace.history,archiveEpoch]);
 const versions = api.listResourceVersions(resourceKey, offset, 25), head = index.heads.get(resourceKey);
 const currentRevision = head ? index.revisions.get(head.revisionId) : undefined;
 const title = currentRevision?.snapshot;
 const type = currentRevision?.resourceType, resourceId = currentRevision?.resourceId;
 const identity = {'data-resource-key': resourceKey, 'data-resource-type': type, 'data-resource-id': resourceId};
 const versionLabel = (id?: string) => id ? 'Version ' + (index.revisions.get(id)?.number ?? '(unavailable)') : 'Current';
 async function run(fn: () => unknown | Promise<unknown>, close = false) {
  if (inFlight.current) return;
  inFlight.current = true; setBusy(true); setError('');
  try { await fn(); if (close) onClose(); }
  catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  finally { inFlight.current = false; setBusy(false); }
 }
 function close() { if (!inFlight.current) onClose(); }
 async function copy(id: string) {
  const target = api.getResource(resourceKey, id).target;
  const base = target.kind === 'collection' ? '#/collection/' + encodeURIComponent(target.collectionId)
   : '#/page/' + encodeURIComponent('pageId' in target ? target.pageId! : resourceId!);
  const link = new URL(base + '?revision=' + encodeURIComponent(id), window.location.href).href;
  try {
   if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(link); setManualLink('');
   notify('Pinned revision link copied. It requires the matching local history or full backup.');
  } catch {
   setManualLink(link);
   notify('Clipboard unavailable. Copy the selected revision link shown in Version History.');
  }
 }
 return <Modal title="Version History" onClose={close} wide>
  <div className="history-panel" {...identity} aria-busy={busy}>
   <p className="eyebrow">CONTENT HISTORY / NOT WORKSPACE STATES</p>
   <h2>{title?.page?.title ?? title?.project?.title ?? resourceKey}</h2>
   <p className="secondary">Immutable snapshots. Reading positions, captures and QCM attempts stay separate. Opening a version never changes current content.</p>
   <div className="history-tools">
    <label>Open revision in<select aria-label="Revision destination" data-agent-action="revision-destination" disabled={busy}
     value={destination} onChange={e => setDestination(/^[1-5]$/.test(e.target.value) ? Number(e.target.value) as 1|2|3|4|5 : e.target.value as ReadingDestination)}>
     <option value="here">Here</option><option value="tab">New tab</option><option value="pane">Other pane</option>
     {[1, 2, 3, 4, 5].map(n => <option value={n} key={n}>Workspace {n}</option>)}
    </select></label>
    <button disabled={busy || !head} data-agent-action="history-export" onClick={() => void run(() => downloadJSON({schemaVersion: 1, kind: 'atlas-resource-history-export', resourceKey, revisions: index.versions.get(resourceKey) ?? []}, resourceKey.replace(':', '-') + '-history.json'))}>Export resource history</button>
   </div>
   <p className="secondary">Revision exports contain source and asset references, not PDF bytes. Use a full workspace backup to transfer historical local files.</p>
   {error && <p role="alert" className="history-error">{error}</p>}
   {manualLink && <label className="field">Pinned revision link<input aria-label="Pinned revision link" readOnly value={manualLink} onFocus={e => e.target.select()} /></label>}
   <details className="history-pair-picker" open={!!compareA || !!compareB}>
    <summary>Compare any two versions</summary>
    <p>Use the A / B buttons on a revision below. Selections are retained while browsing older pages. A is before; B is after.</p>
    <div className="button-row" role="group" aria-label="Selected revision pair">
     <span data-compare-side="A" data-revision-id={compareA}>A: {compareA ? versionLabel(compareA) : 'Choose a version'}</span>
     <span data-compare-side="B" data-revision-id={compareB ?? head?.revisionId}>B: {versionLabel(compareB)}</span>
     <button disabled={busy} data-agent-action="compare-current" onClick={() => setCompareB(undefined)}>Use current as B</button>
     <button disabled={busy || !compareA || compareA === (compareB ?? head?.revisionId)} data-agent-action="compare-selected-versions"
      onClick={() => compareA && void run(() => api.compareRevisions(resourceKey, compareA, compareB), true)}>Compare selected versions</button>
    </div>
   </details>
   {workspace.history?.reviews.some(r => (r.plan as any)?.operations?.some((op: any) => op.resourceKey === resourceKey)) && <details className="history-proposals">
    <summary>AI drafts and proposals for this resource</summary>
    {workspace.history.reviews.filter(r => (r.plan as any)?.operations?.some((op: any) => op.resourceKey === resourceKey)).slice(-100).reverse().map(review => <p key={review.id} data-review-id={review.id}>
     <strong>{review.id}</strong> / {review.status} <button disabled={busy} data-agent-action="agent-review" onClick={() => void run(() => api.openAgentSystemSurface('agent-review'))}>Open Agent Review</button>
    </p>)}
   </details>}
   <ArchiveManager built={built} assets={assets} resourceKey={resourceKey} disabled={busy}/>
   {!head && <p role="status">No history is available for this resource. Complete initialization or import its full backup.</p>}
   {versions.items.map(revision => {
    const owner=archiveForRevision(workspace.history,revision.revisionId);
    const restoring = confirm?.revisionId === revision.revisionId;
    const headChanged = restoring && confirm?.expectedHead !== head?.revisionId;
    return <article className="revision-row" key={revision.revisionId} {...identity} data-revision-id={revision.revisionId} data-current-revision={revision.revisionId === head?.revisionId}>
     <header><strong>Version {revision.number}{revision.revisionId === head?.revisionId ? ' / Current' : ''}</strong><span>{revision.source}</span><time dateTime={new Date(revision.createdAt).toISOString()}>{new Date(revision.createdAt).toLocaleString()}</time></header>
     <p>{revision.summary || 'Content revision'}</p>{owner&&<p className="secondary" data-archive-owner={owner.archiveId}>Archived / {isArchiveAttached(workspace.history,owner.archiveId)?'Verified file attached':'Attach required file'}: <code>{owner.archiveId}</code><br/>Root: <code>{owner.rootHash}</code></p>}
     <details><summary>Revision identity and provenance</summary><code>{revision.revisionId}</code><p>Content SHA-256: <code>{revision.contentHash}</code></p>
      {revision.restoredFromRevisionId && <p>Restored from: <code>{revision.restoredFromRevisionId}</code></p>}<p>{revision.sourceDetail}</p>
      {revision.resourceType === 'pdf' && <pre>{JSON.stringify(index.revisions.get(revision.revisionId)?.snapshot?.pdfProvenance, null, 2)}</pre>}
     </details>
     <div className="button-row">
      <button disabled={busy} data-agent-action="revision-open" data-destination={destination} onClick={() => void run(() => api.navigateAgentTarget(api.getResource(resourceKey, revision.revisionId).target, destination), true)}>Open version {revision.number}</button>
      <button disabled={busy} data-agent-action="revision-compare" onClick={() => void run(() => api.compareRevisions(resourceKey, revision.revisionId), true)}>Compare with current</button>
      <button disabled={busy} data-agent-action="revision-copy-link" onClick={() => void run(() => copy(revision.revisionId))}>Copy pinned link</button>
      <button disabled={busy} data-agent-action="revision-export" onClick={() => void run(() => downloadJSON(api.getResource(resourceKey, revision.revisionId), resourceKey.replace(':', '-') + '-v' + revision.number + '.json'))}>Export version</button>
      <button disabled={busy || !head} data-agent-action="revision-restore" onClick={() => head && setConfirm({revisionId: revision.revisionId, expectedHead: head.revisionId})}>Restore as new version</button>
     </div>
     <div className="button-row history-pair-actions" role="group" aria-label={'Compare selection for version ' + revision.number}>
      <button disabled={busy} aria-pressed={compareA === revision.revisionId} data-agent-action="compare-select-a" onClick={() => setCompareA(revision.revisionId)}>Use as A</button>
      <button disabled={busy} aria-pressed={compareB === revision.revisionId} data-agent-action="compare-select-b" onClick={() => setCompareB(revision.revisionId)}>Use as B</button>
     </div>
     {restoring && <div className="history-confirm" role="group" aria-label="Confirm restore as new version">
      {headChanged ? <p role="alert">Current content changed after you opened this confirmation. Cancel and review the new current version before restoring.</p>
       : <p>Append version {(head?.number ?? 0) + 1} using this snapshot? Current content changes; all older versions and personal state are kept.</p>}
      <button className="primary" disabled={busy || headChanged || !confirm} data-agent-action="revision-restore-confirm" onClick={() => confirm && void run(async () => {
       await restoreAsNewRevision(built, confirm.revisionId, confirm.expectedHead);
       setConfirm(undefined); notify('Historical content restored as a new version.');
      })}>Confirm new version</button>
      <button disabled={busy} data-agent-action="revision-restore-cancel" onClick={() => setConfirm(undefined)}>Cancel restore</button>
     </div>}
    </article>;
   })}
   <div className="button-row"><button disabled={busy || !offset} data-agent-action="history-newer" onClick={() => setOffset(n => Math.max(0, n - 25))}>Newer versions</button>
    <span role="status">{versions.total} versions</span><button disabled={busy || versions.nextOffset === null} data-agent-action="history-older" onClick={() => setOffset(versions.nextOffset!)}>Older versions</button></div>
  </div>
 </Modal>;
}

export function revisionComparison(catalogue: Catalogue, workspace: Workspace, session: Session) {
 if (session.panes.length !== 2) return;
 const locations = session.panes.map(pane => current(pane.views.find(view => view.id === pane.active)));
 if (!locations.some(location => location?.historyRevisionId)) return;
 const resources = locations.map(location => {
  if (!location) return;
  const projection = historicalCatalogue(catalogue, workspace, location.historyRevisionId);
  if (projection.warning) return;
  const target = currentResourceTarget(projection.catalogue, location);
  if (!target) return;
  const key = resourceKeyForTarget(projection.catalogue, target);
  if (projection.revision && projection.revision.resourceKey !== key) return;
  return projection.revision ?? captureResources(catalogue, workspace).find(resource => resource.resourceKey === key);
 });
 const [a, b] = resources;
 if (!a || !b || a.resourceKey !== b.resourceKey) return {changes: [], label: 'Select two versions of the same resource to see semantic changes.', comparable: false};
 const label = (resource: {resourceKey: string; number?: number}, pinned: boolean) => {
  const revision = resource.number ?? workspace.history?.heads.find(h => h.resourceKey === resource.resourceKey)?.number;
  return (pinned ? 'Version ' : 'Current / version ') + (revision ?? '?');
 };
 return {changes: semanticDiff(a.resourceType, a.snapshot, b.snapshot), label: resourceAdapters[a.resourceType].summarize(b.snapshot), comparable: true,
  beforeLabel: label(a, !!locations[0]?.historyRevisionId), afterLabel: label(b, !!locations[1]?.historyRevisionId)};
}
export function RevisionCompareBar({mode, onMode, label, beforeLabel, afterLabel}: {mode: string; onMode: (mode: Session['revisionCompareMode']) => void; label: string; beforeLabel?: string; afterLabel?: string}) {
 return <div className="revision-compare-bar"><span title={label}>Version Compare / {label}{beforeLabel && afterLabel && <small className="comparison-identities">A: {beforeLabel} / B: {afterLabel}</small>}</span>
  <div role="group" aria-label="Compare mode">{([['changes', 'Changes'], ['side-by-side', 'Side by side'], ['a', 'A only'], ['b', 'B only']] as const).map(([id, text]) => <button key={id} data-agent-action="compare-mode" data-compare-mode={id} aria-pressed={mode === id} onClick={() => onMode(id)}>{text}</button>)}</div>
 </div>;
}
