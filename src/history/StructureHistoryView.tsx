import React, {useMemo, useState} from '../vendor/react.mjs';
import type {Catalogue, Workspace, TreeNode} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import type {ResourceSnapshot} from './model.js';
import {targetForPage} from '../core/reading-lists.js';
import {resolveTarget} from '../references/targets.js';

type Props = {
 snapshot: ResourceSnapshot; revisionId?: string; catalogue: Catalogue; workspace: Workspace;
 onOpen: (target: ReadingTarget) => unknown;
};
type Row = {id: string; title: string; depth: number; path: string; target?: ReadingTarget; archived: boolean};
/** A structure revision owns placements/order, not a snapshot of every child.
 * Keep that distinction visible; never attach the tree's revision ID to a page. */
export function StructureHistoryView({snapshot, revisionId, catalogue, workspace, onOpen}: Props) {
 const [limit, setLimit] = useState(250);
 const project = snapshot.project;
 const rows = useMemo(() => {
  const values: Row[] = [], archived = new Set(snapshot.archived ?? []);
  const walk = (nodes: TreeNode[], depth: number, path: string[]) => {
   for (const node of nodes) {
    const target = node.target ?? (node.pageId ? catalogue.pages.some(p => p.id === node.pageId)
     ? targetForPage(catalogue, node.pageId) : {kind: 'page' as const, pageId: node.pageId} : undefined);
    const next = [...path, node.title];
    values.push({id: node.id, title: node.title, depth, path: next.join(' / '), target,
     archived: archived.has(node.id) || !!node.pageId && archived.has(node.pageId)});
    if (node.children) walk(node.children, depth + 1, next);
   }
  };
  walk(snapshot.project?.nodes ?? [], 0, []);
  for (const reference of snapshot.references ?? []) values.push({id: reference.id, title: reference.title,
   depth: 0, path: reference.taxonomy.path?.join(' / ') ?? reference.taxonomy.subject,
   target: reference.target, archived: false});
  return values;
 }, [snapshot, catalogue]);
 return <section className="history-readonly-summary" data-resource-key={'notebook-tree:' + project?.id}
  data-resource-id={project?.id} data-resource-type="notebook-tree" data-revision-id={revisionId}>
  <p className="eyebrow">{revisionId ? 'HISTORICAL' : 'CURRENT'} NOTEBOOK STRUCTURE / READ-ONLY VIEW</p>
  <h2>{project?.title ?? 'Notebook structure'}</h2>
  {project?.description && <p>{project.description}</p>}
  <p>Placements, folder order and reference targets are preserved here. Child pages keep their own history.
   A floating placement opens its current target; a pinned placement opens only its named version.
   Restoring this structure does not rewind the contents of every child page.</p>
  <p className="secondary">{rows.length} placements. {snapshot.category ? 'Category: ' + snapshot.category + '. ' : ''}
   {snapshot.archived?.length ? snapshot.archived.length + ' archived identities recorded.' : ''}</p>
  <ol className="history-structure-list" aria-label="Recorded Notebook placements">
   {rows.slice(0, limit).map(row => {
    let resolved: ReturnType<typeof resolveTarget> | undefined, warning: string | undefined;
    if (row.target) {
     try { resolved = resolveTarget(catalogue, workspace, row.target); }
     catch (error) { warning = error instanceof Error ? error.message : 'Target unavailable.'; }
    }
    const target = resolved?.openTarget;
    return <li key={row.id} data-node-id={row.id} data-history-depth={row.depth}
     style={{paddingInlineStart: Math.min(row.depth, 8) * 18 + 8}}>
     <div><strong title={row.path}>{row.title}</strong><small>{row.target ? 'Reference / ' : 'Folder / '}{row.id}{row.archived ? ' / Archived in this structure' : ''}</small></div>
     {target?.kind === 'url' && resolved?.available ? <a href={target.url} target="_blank" rel="noopener noreferrer" data-agent-action="reference-open-external">Open external target</a>
      : row.target && <button disabled={!resolved?.available || !target} title={warning ?? resolved?.warning}
       data-agent-action="structure-target-open" data-target-kind={row.target.kind}
       data-target-history-revision-id={row.target.historyRevisionId}
       onClick={() => target && onOpen(target)}>{row.target.historyRevisionId ? 'Open pinned target' : resolved?.exact === false ? 'Open available parent' : 'Open current target'}</button>}
     {(warning || resolved?.warning) && <p className="secondary">{warning ?? resolved?.warning}</p>}
    </li>;
   })}
  </ol>
  {!rows.length && <p className="empty-state">This structure has no placements.</p>}
  {rows.length > limit && <button data-agent-action="structure-more" onClick={() => setLimit(value => value + 250)}>Show more placements ({rows.length - limit} remaining)</button>}
  <details><summary>Inspect structure metadata</summary><pre>{JSON.stringify({preferences: snapshot.preferences,
   category: snapshot.category, archived: snapshot.archived}, null, 2)}</pre></details>
 </section>;
}
