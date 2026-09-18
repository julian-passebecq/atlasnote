import type {Catalogue, Workspace} from '../core/model.js';
import type {ResourceTarget} from '../core/reading-types.js';
import type {HistoryData, ResourceHead, ResourceRevision, ResourceType} from './model.js';
import {historicalCatalogue, resourceKeyForTarget} from './adapters.js';

export type HistoryIndex = {
 heads: Map<string, ResourceHead>;
 revisions: Map<string, ResourceRevision>;
 versions: Map<string, ResourceRevision[]>;
};

/** Build once per committed history snapshot, not once for every visible tree row. */
export function createHistoryIndex(history?: HistoryData): HistoryIndex {
 const heads = new Map((history?.heads ?? []).map(h => [h.resourceKey, h]));
 const revisions = new Map<string, ResourceRevision>();
 const versions = new Map<string, ResourceRevision[]>();
 for (const revision of history?.revisions ?? []) {
  revisions.set(revision.revisionId, revision);
  const rows = versions.get(revision.resourceKey) ?? [];
  rows.push(revision);
  versions.set(revision.resourceKey, rows);
 }
 for (const rows of versions.values()) rows.sort((a, b) => b.number - a.number);
 return {heads, revisions, versions};
}

export type HistoryUIContext = {
 resourceKey: string;
 resourceId: string;
 resourceType: ResourceType;
 currentRevisionId?: string;
 selectedRevisionId?: string;
 previousRevisionId?: string;
 historyRevisionId?: string;
 versionCount: number;
 unavailableReason?: string;
 previousUnavailableReason?: string;
};

/** Display identity comes from the canonical catalogue, never projected grouping IDs.
 * A folder resolves to its owning Notebook structure. A manual reference resolves
 * to its target, not the placement ID. Explicit history must match that identity. */
export function historyContextForTarget(
 catalogue: Catalogue, workspace: Workspace, target: ResourceTarget | undefined,
 index: HistoryIndex = createHistoryIndex(workspace.history)
): HistoryUIContext | undefined {
 if (!target) return;
 const projection = historicalCatalogue(catalogue, workspace, target.historyRevisionId);
 const key = resourceKeyForTarget(projection.catalogue, target);
 if (!key) return;
 const separator = key.indexOf(':');
 const current = index.heads.get(key);
 const selected = target.historyRevisionId
  ? index.revisions.get(target.historyRevisionId)
  : current ? index.revisions.get(current.revisionId) : undefined;
 const warning = projection.warning ?? (selected && selected.resourceKey !== key
  ? 'This historical revision belongs to another resource.'
  : undefined);
 const validSelected = !warning && selected?.resourceKey === key ? selected : undefined;
 // Follow the immutable parent, not an unrelated row or a global array index.
 const parent = validSelected?.parentRevisionId ? index.revisions.get(validSelected.parentRevisionId) : undefined;
 const previous = parent?.resourceKey === key ? parent : undefined;
 const unavailableReason = warning ?? (!validSelected
  ? 'History is not available yet. Complete initialization or import the matching full backup.'
  : undefined);
 return {
  resourceKey: key, resourceId: key.slice(separator + 1), resourceType: key.slice(0, separator) as ResourceType,
  currentRevisionId: current?.revisionId, selectedRevisionId: validSelected?.revisionId,
  historyRevisionId: target.historyRevisionId, previousRevisionId: previous?.revisionId,
  versionCount: index.versions.get(key)?.length ?? 0, unavailableReason,
  previousUnavailableReason: unavailableReason ?? (previous ? undefined : validSelected?.parentRevisionId
   ? 'The preceding revision is missing. Import the matching full backup.'
   : 'This is the first version; there is no previous version yet.')
 };
}

/** Only identifiers already visible through a resource control belong in the DOM. */
export function historyIdentityAttributes(context?: HistoryUIContext) {
 return {
  'data-resource-key': context?.resourceKey,
  'data-resource-id': context?.resourceId,
  'data-resource-type': context?.resourceType,
  'data-revision-id': context?.selectedRevisionId,
  'data-current-revision-id': context?.currentRevisionId,
  'data-history-revision-id': context?.historyRevisionId
 };
}
