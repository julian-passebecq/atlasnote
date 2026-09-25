import type {AgentOperation} from './model.js';
import type {OperationDefinition} from './registry.js';
import {RESOURCE_TYPES} from '../history/validation.mjs';

// Descriptive, serializable schemas. Live preview still validates canonical
// source, cross-resource identities, rights, assets, stale bases and capacities.
type Schema = Record<string, unknown>;
const id: Schema = {type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$'};
const text = (maxLength: number, minLength = 1): Schema => ({type: 'string', minLength, maxLength});
const object = (properties: Record<string, Schema>, required: readonly string[]): Schema => ({type: 'object', additionalProperties: false, properties, required: [...required]});
const hash = (length: number): Schema => ({type: 'string', pattern: '^[a-f0-9]{' + length + '}$'});
export const READING_DESTINATIONS = ['here', 'tab', 'pane', 1, 2, 3, 4, 5] as const;
const taxonomy = object({subject: {enum: ['it', 'cloud', 'job', 'kpi', 'norsk']}, folderId: id,
 path: {type: 'array', maxItems: 60, items: text(200)}}, ['subject']);
const anchor = object({blockId: id, questionId: id, sheetId: id,
 sheetPage: {type: 'integer', minimum: 1, maximum: 64}, pdfPage: {type: 'integer', minimum: 1, maximum: 1000000},
 pdfRevision: text(256, 0), unit: text(256, 0), atStart: {type: 'boolean'},
 offset: {type: 'number', minimum: -1000000, maximum: 1000000}, viewportOffset: {type: 'number', minimum: -1000000, maximum: 1000000},
 pdfOffset: {type: 'number', minimum: -10, maximum: 10}}, []);
function targetVariant(kind: string, fields: Record<string, Schema>, required: string[], historical = true): Schema {
 return object({kind: {const: kind}, ...fields, ...(historical ? {historyRevisionId: id} : {})}, ['kind', ...required]);
}
export const readingTargetSchema: Schema = {oneOf: [
 targetVariant('page', {pageId: id, anchor}, ['pageId']),
 targetVariant('article', {articleId: id, pageId: id, anchor}, ['articleId']),
 targetVariant('qcm', {setId: id, pageId: id, questionId: id}, ['setId']),
 targetVariant('collection', {collectionId: id}, ['collectionId']),
 targetVariant('cheatsheet-page', {pageId: id, documentId: id, sheetPage: {type: 'integer', minimum: 1, maximum: 64}, anchor}, ['pageId', 'documentId', 'sheetPage']),
 targetVariant('pdf-page', {pageId: id, documentId: id, pdfPage: {type: 'integer', minimum: 1, maximum: 1000000}, revision: hash(64), anchor}, ['pageId', 'documentId', 'pdfPage']),
 targetVariant('pdf-category', {pageId: id, documentId: id, pdfPage: {type: 'integer', minimum: 1, maximum: 1000000}, revision: hash(64), pdfCategoryId: id}, ['pageId', 'documentId', 'pdfPage', 'pdfCategoryId']),
 targetVariant('dashboard-item', {itemId: id}, ['itemId'], false),
 targetVariant('url', {url: {...text(2048), pattern: '^https?://', description: 'Credential-free address. Requires an explicit external-link action, not internal navigation.'}}, ['url'], false)
]};
const canonical = (description: string, validator: string): Schema => ({type: 'object', description, 'x-runtime-validator': validator});
const snapshot = object({
 page: canonical('Complete canonical page. Copy getResource(...).snapshot; preserve all source IDs and non-edited fields.', 'history/validation.mjs:validateResourceSnapshot'),
 project: canonical('Notebook structure. Native nodes use pageId or children; manual reference placements use the separate references array.', 'history/validation.mjs:validateResourceSnapshot'),
 document: canonical('PDF document identity, immutable byte reference, rights and visibility. Never raw bytes.', 'history/validation.mjs:validateResourceSnapshot'),
 taxonomy: {anyOf: [taxonomy, {type: 'null'}]},
 references: {type: 'array', maxItems: 2000, items: object({id, title: text(200), target: readingTargetSchema, taxonomy, createdAt: {type: 'integer', minimum: 0, maximum: 8640000000000000}}, ['id', 'title', 'target', 'taxonomy', 'createdAt'])},
 category: {enum: ['informatics', 'cloud', 'job', 'personal', 'norsk', null]},
 archived: {type: 'array', uniqueItems: true, items: id},
 preferences: object({title: {type: 'string'}, icon: {type: 'string'}, description: {type: 'string'}, hidden: {type: 'boolean'}, order: {type: 'number'}}, []),
 assetRefs: {type: 'object', maxProperties: 2000, additionalProperties: object({key: text(2048), sha256: hash(64), mediaType: text(120, 0)}, ['key', 'sha256', 'mediaType'])},
 pdfProvenance: object({logicalDocumentId: id, repository: text(200), commit: hash(40), relativePath: text(2048), sha256: hash(64), bytes: {type: 'integer', minimum: 1}, pageCount: {type: 'integer', minimum: 1}, metadataRevision: text(200, 0), rights: canonical('Preserve reviewed rights; never upgrade automatically.', 'history/validation.mjs:validateResourceSnapshot')}, ['logicalDocumentId', 'metadataRevision', 'rights']),
 companion: {anyOf: [canonical('Authored PDF page/category metadata; separate from PDF bytes.', 'companion/validation.mjs:validateCompanion'), {type: 'null'}]}
}, []);
const operationKinds: Record<string, string> = {'notebook.tree.createNode': 'add', 'notebook.tree.renameNode': 'rename', 'notebook.tree.moveNode': 'move', 'notebook.tree.reorderNode': 'order'};
function structural(kind: string): Schema {
 const expected = operationKinds[kind];
 return object({kind: {const: expected}, nodeId: id, projectId: id, parentId: id,
  node: canonical('Native folder {id,title,children:[]} or page placement {id,title,pageId}. For typed references update notebook-tree:atlas.manual-references.', 'storage/state-validation.mjs:validateState'),
  title: text(200), delta: {type: 'integer', minimum: -10000, maximum: 10000}},
 ['kind', 'nodeId', ...(expected === 'add' ? ['projectId', 'node'] : expected === 'move' ? ['projectId'] : expected === 'rename' ? ['title'] : ['delta'])]);
}
export function operationPayloadSchema(kind: AgentOperation['kind'], definition: OperationDefinition): Schema {
 const fields: Record<string, Schema> = {
  resourceType: {enum: [...(definition.resourceTypes.length ? definition.resourceTypes : RESOURCE_TYPES)]}, snapshot,
  revisionId: id, destinationBaseRevisionId: id, taxonomy: kind === 'taxonomy.assign' ? {anyOf: [taxonomy, {type: 'null'}]} : taxonomy,
  target: readingTargetSchema, source: readingTargetSchema, sourceRevision: hash(16), targetRevision: hash(16),
  index: {type: 'integer', minimum: 0, maximum: 49}, label: text(kind.startsWith('resource.link.') ? 160 : 200),
  id, title: text(kind === 'bookmark.add' || kind === 'readLater.add' ? 120 : 500), text: text(100000), note: text(2000),
  url: {...text(2048), pattern: '^https?://'}, status: {enum: ['inbox', 'open', 'done', 'archived']},
  kind: {enum: kind === 'capture.create' ? ['link', 'task', 'note'] : ['link', 'context', 'related']},
  subject: {enum: ['it', 'cloud', 'job', 'kpi', 'norsk']}, aliases: {type: 'array', maxItems: 30, items: text(200)}, parentId: id, assignTo: readingTargetSchema,
  destination: {enum: [...READING_DESTINATIONS]}, enabled: {type: 'boolean'}, mode: {enum: ['changes', 'side-by-side', 'a', 'b']}, pane: {enum: ['A', 'B']},
  batch: {...canonical('Existing atlas-reference-suggestions schema 1; preserve semanticRevision and exact target/source fingerprints. This operation stages a second explicit semantic review.', 'references/validation.mjs:validateSuggestionBatch'), required: ['schemaVersion', 'kind', 'semanticRevision', 'suggestions'], properties: {schemaVersion: {const: 1}, kind: {const: 'atlas-reference-suggestions'}, semanticRevision: {type: 'integer', minimum: 0}, suggestions: {type: 'array', minItems: 1, maxItems: 100, items: {type: 'object'}}}}
 };
 if (kind.startsWith('notebook.tree.')) fields.operation = structural(kind);
 return {...object(Object.fromEntries(definition.payloadFields.map(field => [field, fields[field]])), definition.required),
  description: definition.description,
  'x-validation-scope': 'Payload envelope and navigation shapes. Canonical source and cross-resource invariants are additionally checked by validateChangeSet and live preview; this is not permission to write.'};
}
