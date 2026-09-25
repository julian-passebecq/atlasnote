// Copy of the Mongoku galaxy projection consumption rules, used as an independent test oracle.
// Source: julian-passebecq/Mongoku-datapass src/lib/datapass/projection.ts (parseProjection,
// projectionEnvelopeSchema) and src/lib/datapass/aiContext.ts (scrubSecrets) at 7c9363b (spaced key names, Mongoku-datapass#14);
// contract docs/GALAXY_PROJECTION_CONTRACT_2026-09-25.md. The zod schema is transcribed by hand.
// Keep this file a faithful copy: AtlasNote's own guard lives in src/content-hub/planning.ts.

export const PROJECTION_LIMITS = {bytes: 64 * 1024, items: 25, counts: 30, text: 500};

const SECRET_PATTERNS = [
 /mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi,
 /\b(?:postgres(?:ql)?|mysql|redis|amqp):\/\/[^\s"'`]+/gi,
 /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
 /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
 /\bsk-[A-Za-z0-9_-]{16,}\b/g,
 /\bAKIA[0-9A-Z]{16}\b/g,
 /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
 /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
 /\b(password|passwd|pwd|secret|token|api[ _-]?key|client[ _-]?secret)\s*[:=]\s*[^\s,;"'`]+/gi,
];
export function scrubSecrets(value) {
 return SECRET_PATTERNS.reduce((current, pattern) => current.replace(pattern, (match, key) => typeof key === 'string' && /[:=]/.test(match) ? key + '=[redacted]' : '[redacted]'), value);
}

const SECRET_KEY = /passw(?:or)?d|passphrase|pwd|secret|token|api_?key|private_?key|recovery_?(?:code|key)|connection_?string|dotenv|env_?contents?/i;
const SAFE_KEY_SUFFIX = /(?:_ref|Ref|_id|Id|_name|Name|_label|Label|_present|Present|_missing|Missing|_expected|Expected|_exists|Exists|_at|At|_count|Count|_status|Status)$/;
const DOTENV_LINE = /^\s*(?:export\s+)?[A-Z][A-Z0-9_]*\s*=/gm;

function secretFindings(value, path, out) {
 if (typeof value === 'string') {
  if (scrubSecrets(value) !== value) out.push(path + ': credential-like value');
  else if ((value.match(DOTENV_LINE) ?? []).length >= 2) out.push(path + ': looks like .env contents');
  return;
 }
 if (Array.isArray(value)) { value.forEach((nested, index) => secretFindings(nested, path + '[' + index + ']', out)); return; }
 if (value && typeof value === 'object') {
  for (const [key, nested] of Object.entries(value)) {
   const keyPath = path ? path + '.' + key : key;
   if (SECRET_KEY.test(key) && !SAFE_KEY_SUFFIX.test(key)) out.push(keyPath + ': secret-like field name');
   secretFindings(nested, keyPath, out);
  }
 }
}
export function findSecretLikeFields(raw) { const out = []; secretFindings(raw, '', out); return out; }

// cockpit.ts timeOf: a bare date is read as UTC midnight.
const timeOf = value => typeof value === 'string' && value ? Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value + 'T00:00:00Z' : value) : NaN;
const isText = v => typeof v === 'string' && v.length >= 1 && v.length <= PROJECTION_LIMITS.text;
const isTime = v => typeof v === 'string' && Number.isFinite(timeOf(v));
const isOpenUri = v => { try { const u = new URL(v); return ['https:', 'http:', 'vscode:'].includes(u.protocol) && !u.username && !u.password; } catch { return false; } };

function schemaIssues(raw) {
 const issues = [], need = (ok, path, message) => { if (!ok) issues.push(path + ': ' + message); };
 if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ['(root): expected object'];
 need(typeof raw.format === 'string' && /^[a-z0-9-]+\.[a-z0-9-]+\/\d+$/.test(raw.format), 'format', 'must look like <app>.<name>/<major>');
 need(isText(raw.projectRef), 'projectRef', 'bounded text');
 need(['powerops', 'atlasnote', 'datapass-vscode', 'diagramcloud', 'mongoku'].includes(raw.sourceApp), 'sourceApp', 'enum');
 need(isText(raw.sourceObjectId), 'sourceObjectId', 'bounded text');
 if (raw.sourceRevision !== undefined) need(isText(raw.sourceRevision), 'sourceRevision', 'bounded text');
 need(isTime(raw.generatedAt), 'generatedAt', 'must be an ISO date or timestamp');
 if (raw.observedAt !== undefined) need(isTime(raw.observedAt), 'observedAt', 'must be an ISO date or timestamp');
 if (raw.openUri !== undefined) need(isOpenUri(raw.openUri), 'openUri', 'http(s) or vscode link without credentials');
 need(isText(raw.authority), 'authority', 'bounded text');
 need(['private', 'shareable'].includes(raw.visibility), 'visibility', 'enum');
 need(['snapshot', 'live', 'unknown'].includes(raw.freshness), 'freshness', 'enum');
 if (raw.lifecycle !== undefined) need(['current', 'historical', 'frozen'].includes(raw.lifecycle), 'lifecycle', 'enum');
 if (raw.counts !== undefined) {
  const ok = raw.counts && typeof raw.counts === 'object' && !Array.isArray(raw.counts);
  need(ok, 'counts', 'record');
  if (ok) {
   need(Object.keys(raw.counts).length <= PROJECTION_LIMITS.counts, 'counts', 'too many count keys');
   for (const [k, v] of Object.entries(raw.counts)) { need(k.length <= 64, 'counts.' + k, 'key too long'); need(Number.isInteger(v) && v >= 0, 'counts.' + k, 'non-negative integer'); }
  }
 }
 if (raw.items !== undefined) {
  need(Array.isArray(raw.items) && raw.items.length <= PROJECTION_LIMITS.items, 'items', 'array of at most ' + PROJECTION_LIMITS.items);
  (Array.isArray(raw.items) ? raw.items : []).forEach((item, i) => {
   const at = 'items.' + i;
   if (!item || typeof item !== 'object' || Array.isArray(item)) { issues.push(at + ': expected object'); return; }
   need(isText(item.id), at + '.id', 'bounded text');
   need(isText(item.title), at + '.title', 'bounded text');
   for (const k of ['kind', 'status']) if (item[k] !== undefined) need(isText(item[k]), at + '.' + k, 'bounded text');
   if (item.dueAt !== undefined) need(isTime(item.dueAt), at + '.dueAt', 'must be an ISO date or timestamp');
   if (item.openUri !== undefined) need(isOpenUri(item.openUri), at + '.openUri', 'http(s) or vscode link without credentials');
  });
 }
 return issues;
}

/** Mongoku's parseProjection: size and secret checks on the raw payload first, then the schema. */
export function parseProjection(raw) {
 const size = JSON.stringify(raw ?? null).length;
 if (size > PROJECTION_LIMITS.bytes) return {ok: false, reason: 'too_large', issues: [size + ' bytes > ' + PROJECTION_LIMITS.bytes]};
 const secrets = findSecretLikeFields(raw);
 if (secrets.length) return {ok: false, reason: 'secret_like', issues: secrets};
 const issues = schemaIssues(raw);
 if (issues.length) return {ok: false, reason: 'invalid', issues};
 return {ok: true, projection: raw};
}
