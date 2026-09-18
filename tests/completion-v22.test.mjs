/** Coding-pass regression specifications. NOT EXECUTED by the authoring pass.
 * Codex Light: run after build:offline, then run all original release gates.
 * These unit fixtures are not IndexedDB/PDF/browser evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup, built, edit, plan} from './v22/fixtures.mjs';
import {compose, current} from '../dist-offline/app/core/workspace.js';
import {activeSession} from '../dist-offline/app/core/workspace-slots.js';
import {normalizeReadingTargetIdentity} from '../dist-offline/app/core/reading-types.js';
import {resourceKeyForTarget} from '../dist-offline/app/history/adapters.js';
import {createHistoryIndex, historyContextForTarget, historyIdentityAttributes} from '../dist-offline/app/history/ui-context.js';
import {operationRegistry} from '../dist-offline/app/agent/registry.js';
import {validateChangeSet} from '../dist-offline/app/agent/validation.js';

const NOTE = 'notebook-page:page.atlas.welcome';
const TREE_REFS = 'notebook-tree:atlas.manual-references';
async function append(backend) {
 await backend.manual(ws => {
  const catalogue = compose(built, ws), page = structuredClone(catalogue.pages.find(p => p.id === 'page.atlas.welcome'));
  page.summary += ' / edited'; ws.overlays.pages[page.id] = {page};
 });
}
function activeLocations(backend) {
 return activeSession(backend.state.personal).panes.map(pane => current(pane.views.find(view => view.id === pane.active)));
}

test('Completion: wrapper normalization resolves canonical Article/QCM IDs without changing caller data', async () => {
 const {backend} = await setup(), catalogue = structuredClone(compose(built, backend.state));
 const article = catalogue.pages.find(p => p.article), qcm = catalogue.pages.find(p => p.qcm);
 // V2.2 keeps one identity. An earlier handoff fixture mutated this catalogue
 // into an invalid state; the user explicitly retained the established schema.
 assert.equal(article.article.id, article.id); assert.equal(qcm.qcm.id, qcm.id);
 for (const [target, page, key] of [[{kind:'article',articleId:article.article.id},article,'article:'], [{kind:'qcm',setId:qcm.qcm.id},qcm,'qcm:']]) {
  assert.equal(normalizeReadingTargetIdentity(catalogue, target).pageId, page.id);
  assert.equal(Object.hasOwn(target, 'pageId'), false);
  assert.equal(resourceKeyForTarget(catalogue, target), key + page.id);
 }
 const wrong = {kind:'article',articleId:article.article.id,pageId:'page.wrong.wrapper'};
 assert.equal(normalizeReadingTargetIdentity(catalogue, wrong).pageId, wrong.pageId);
 assert.equal(resourceKeyForTarget(catalogue, wrong), undefined);
});

test('Completion: Article/QCM identity stays canonical through edit and restore; conflicting IDs are rejected', async () => {
 const {api, backend} = await setup();
 for (const type of ['article','qcm']) {
  const key=type+':page.v22.'+type, original=api.getResource(key), id=original.resourceId;
  const conflicting=plan([edit(api,key,s=>{s.page[type].id='document.conflicting';})]);
  const before=JSON.stringify(backend.state);
  assert.throws(()=>api.preview(conflicting),/wrapper identity/);
  assert.equal(JSON.stringify(backend.state),before);
  const change=plan([edit(api,key,s=>{s.page.title+=' renamed';s.page[type].title=s.page.title;})]);
  await api.stage(change);await api.accept(change.id);
  const restore=plan([{id:'operation.identity.restore',kind:'resource.restoreAsNewRevision',resourceKey:key,baseRevisionId:api.getResource(key).head.revisionId,payload:{revisionId:original.head.revisionId}}]);
  await api.stage(restore);await api.accept(restore.id);
  const current=api.getResource(key), historic=api.getResource(key,original.head.revisionId);
  for(const value of [current,historic]) {
   assert.equal(value.resourceId,id);assert.equal(value.snapshot.page.id,id);assert.equal(value.snapshot.page[type].id,id);
   assert.equal(value.target.pageId,id);assert.equal(value.target[type==='article'?'articleId':'setId'],id);
  }
  assert.equal(current.head.number,3);assert.equal(historic.target.historyRevisionId,original.head.revisionId);
 }
});

test('Completion: first history version disables previous; subsequent versions follow immutable parent', async () => {
 const {backend, api} = await setup(), first = api.getResource(NOTE).head.revisionId;
 let catalogue = compose(built, backend.state), info = historyContextForTarget(catalogue, backend.state, api.getResource(NOTE).target);
 assert.equal(info.previousRevisionId, undefined); assert.match(info.previousUnavailableReason, /first version/i);
 await append(backend); catalogue = compose(built, backend.state);
 info = historyContextForTarget(catalogue, backend.state, api.getResource(NOTE).target, createHistoryIndex(backend.state.history));
 assert.equal(info.previousRevisionId, first); assert.equal(info.unavailableReason, undefined);
 assert.equal(historyIdentityAttributes(info)['data-resource-key'], NOTE);
 assert.equal(historyIdentityAttributes(info)['data-resource-type'], 'notebook-page');
});

test('Completion: pinned menu context follows the pin parent rather than the current head parent', async () => {
 const {backend, api} = await setup(), first = api.getResource(NOTE).head.revisionId;
 await append(backend); const middle = api.getResource(NOTE).head.revisionId;
 await append(backend);
 const info = historyContextForTarget(compose(built, backend.state), backend.state, api.getResource(NOTE, middle).target);
 assert.equal(info.previousRevisionId, first); assert.equal(info.selectedRevisionId, middle);
 assert.notEqual(info.currentRevisionId, middle);
});

test('Completion: another-resource and missing history pins are never substituted', async () => {
 const {backend, api} = await setup(), catalogue = compose(built, backend.state), target = api.getResource(NOTE).target;
 const other = api.getResource('article:page.v22.article').head.revisionId;
 const mismatched = historyContextForTarget(catalogue, backend.state, {...target,historyRevisionId:other});
 assert.match(mismatched.unavailableReason, /another resource/i); assert.equal(mismatched.previousRevisionId, undefined);
 const missing = historyContextForTarget(catalogue, backend.state, {...target,historyRevisionId:'rev.missing'});
 assert.match(missing.unavailableReason, /missing/i); assert.equal(missing.selectedRevisionId, undefined);
});

test('Completion: invalid direct navigation destination leaves all personal state unchanged', async () => {
 const {backend, api} = await setup(), before = JSON.stringify(backend.state.personal);
 await assert.rejects(api.navigateAgentTarget(api.getResource(NOTE).target, 'window-seven'), /ReadingDestination/);
 assert.equal(JSON.stringify(backend.state.personal), before);
});

test('Completion: missing pinned Notebook section blocks navigation and does not offer a parent fallback', async () => {
 const {backend, api} = await setup(), revision = api.getResource(NOTE).head.revisionId;
 const target = {...api.getResource(NOTE, revision).target, anchor:{blockId:'block.missing.in.history'}};
 const before = JSON.stringify(backend.state.personal), resolved = api.resolveTarget(target);
 assert.equal(resolved.available, false); assert.equal(resolved.exact, false); assert.equal(resolved.openTarget, undefined);
 await assert.rejects(api.navigateAgentTarget(target), /not present.*historical/i);
 assert.equal(JSON.stringify(backend.state.personal), before);
});

test('Completion: current semantic references retain their explicitly described parent fallback', async () => {
 const {api} = await setup(), target = {...api.getResource(NOTE).target, anchor:{blockId:'block.missing.current'}};
 const resolved = api.resolveTarget(target);
 assert.equal(resolved.available, true); assert.equal(resolved.exact, false);
 assert(resolved.openTarget); assert.match(resolved.warning, /parent/i);
});

test('Completion: version Compare always places requested before in A, after in B, even from active B', async () => {
 const {backend, api} = await setup(), first = api.getResource(NOTE).head.revisionId;
 await append(backend); const second = api.getResource(NOTE).head.revisionId;
 await api.navigateAgentTarget(api.getResource(NOTE).target, 'pane');
 assert.equal(activeSession(backend.state.personal).activePane, activeSession(backend.state.personal).panes[1].id);
 await api.compareRevisions(NOTE, first, second);
 const [a, b] = activeLocations(backend);
 assert.equal(a.historyRevisionId, first); assert.equal(b.historyRevisionId, second);
 assert.equal(activeSession(backend.state.personal).revisionCompareMode, 'changes');
});

test('Completion: repeated version Compare reuses the active A/B tabs rather than exhausting five-tab capacity', async () => {
 const {backend, api} = await setup(), first = api.getResource(NOTE).head.revisionId;
 await append(backend); await api.compareRevisions(NOTE, first);
 const count = activeSession(backend.state.personal).panes.map(p => p.views.length);
 for (let i=0;i<7;i++) await api.compareRevisions(NOTE, first);
 assert.deepEqual(activeSession(backend.state.personal).panes.map(p => p.views.length), count);
 const [a,b] = activeLocations(backend);assert.equal(a.historyRevisionId, first);assert.equal(b.historyRevisionId, undefined);
});

test('Completion: direct Compare rejects empty/unknown modes without mutating state', async () => {
 const {backend, api} = await setup(), before = JSON.stringify(backend.state.personal);
 await assert.rejects(api.setAgentCompareState({enabled:true,mode:''}), /Invalid Compare/);
 await assert.rejects(api.setAgentCompareState({enabled:true,pane:''}), /Invalid Compare/);
 assert.equal(JSON.stringify(backend.state.personal), before);
});

test('Completion: manual-reference structure is navigable through the same current/pinned facade', async () => {
 const {backend, api} = await setup(), resource = api.getResource(TREE_REFS);
 await api.navigateAgentTarget(resource.target); assert.equal(activeLocations(backend)[0].collectionId, 'atlas.manual-references');
 await api.compareRevisions(TREE_REFS, resource.head.revisionId);
 const [a,b] = activeLocations(backend); assert.equal(a.historyRevisionId, resource.head.revisionId); assert.equal(b.historyRevisionId, undefined);
 assert.equal(api.resolveTarget(resource.target).available, true);
});

test('Completion: capabilities expose concrete envelopes, all navigation methods and exact system-surface names', async () => {
 const {api} = await setup(), caps = api.getAgentCapabilities();
 assert(caps.navigation.includes('compareRevisions')); assert.equal(caps.actions.length, 25);
 assert.deepEqual(caps.navigationContract.systemSurfaces, ['history','agent-review','references','dashboard','capture','states']);
 assert.equal(caps.browserSemantics.actionAttribute, 'data-agent-action');
 assert.equal(JSON.stringify(caps).includes('schemaRef'), false);
 const update = caps.actions.find(a => a.kind === 'resource.update');
 assert.equal(update.payloadSchema.properties.snapshot.type, 'object');
 assert.equal(caps.actions.find(a => a.kind === 'workspace.navigate').payloadSchema.properties.target.oneOf.length, 9);
});

test('Completion: capability consumers cannot mutate operation validators or later manifests', async () => {
 const {api} = await setup(), before = [...operationRegistry['resource.update'].required], caps = api.getAgentCapabilities();
 caps.actions.find(a => a.kind === 'resource.update').payloadSchema.required.length = 0;
 caps.resourceTypes.length = 0; caps.navigation.push('history.erase');
 assert.deepEqual(operationRegistry['resource.update'].required, before);
 assert(api.getAgentCapabilities().resourceTypes.length); assert(!api.getAgentCapabilities().navigation.includes('history.erase'));
});

test('Completion: proposal validation rejects null snapshots and malformed restore IDs immediately', async () => {
 const {api} = await setup(), update = edit(api, NOTE, () => {});update.payload.snapshot = null;
 assert.throws(() => validateChangeSet(plan([update])));
 const restore = {id:'operation.bad.restore',kind:'resource.restoreAsNewRevision',resourceKey:NOTE,baseRevisionId:api.getResource(NOTE).head.revisionId,payload:{revisionId:5}};
 assert.throws(() => validateChangeSet(plan([restore])), /revision ID/);
});

test('Completion: a newly invented dangling manual-reference target is rejected without writing', async () => {
 const {backend, api} = await setup(), before = JSON.stringify(backend.state);
 const op = edit(api, TREE_REFS, snapshot => snapshot.references.push({id:'reference.missing',title:'Missing',target:{kind:'page',pageId:'page.not.present'},taxonomy:{subject:'it'},createdAt:1}));
 assert.throws(() => api.preview(plan([op])));
 assert.equal(JSON.stringify(backend.state), before);
});
