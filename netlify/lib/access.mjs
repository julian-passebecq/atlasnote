/** Server-only access gate. Never import this module into src/ or the Vite graph. */
export const COOKIE_NAME = '__Host-atlasnote_session';
export const UNLOCK_PATH = '/__atlasnote_unlock';
export const LOCK_PATH = '/__atlasnote_lock';
const encoder = new TextEncoder();
const DEFAULT_SECONDS = 30 * 86400;
const MAX_SECONDS = 90 * 86400;
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function unb64(value) {
 if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 1024) throw Error('Malformed session');
 const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
 if (b64(bytes) !== value) throw Error('Noncanonical session');
 return bytes;
}
export function readAccessConfig(get) {
 const verifier = get('ATLASNOTE_ACCESS_KEY_SHA256');
 const duration = get('ATLASNOTE_SESSION_DAYS');
 if (typeof verifier !== 'string' || !/^[a-f0-9]{64}$/.test(verifier) || /^0+$/.test(verifier)) throw Error('Access configuration unavailable');
 if (duration !== undefined && duration !== null && !/^(?:[1-9]|[1-8][0-9]|90)$/.test(duration)) throw Error('Access configuration unavailable');
 return Object.freeze({verifier, seconds: duration ? Number(duration) * 86400 : DEFAULT_SECONDS});
}
export function constantTimeEqual(a, b) {
 // Fixed-size digests/signatures only. No character-by-character early return.
 if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
 let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]; return diff === 0;
}
export async function matchesKey(candidate, config) {
 if (typeof candidate !== 'string' || !/^atlas1_[A-Za-z0-9_-]{43}$/.test(candidate)) return false;
 const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(candidate)));
 return constantTimeEqual(digest, Uint8Array.from(config.verifier.match(/../g), part => parseInt(part, 16)));
}
async function signingKey(config) {
 return crypto.subtle.importKey('raw', encoder.encode(config.verifier), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
const message = payload => encoder.encode('atlasnote/session/v1\0' + payload);
export async function issueSession(config, origin, now = Math.floor(Date.now() / 1000)) {
 const nonce = b64(crypto.getRandomValues(new Uint8Array(16)));
 const payload = b64(encoder.encode(JSON.stringify({v: 1, iat: now, exp: now + config.seconds, aud: origin, nonce})));
 const signature = b64(new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(config), message(payload))));
 return payload + '.' + signature;
}
export async function verifySession(value, config, origin, now = Math.floor(Date.now() / 1000)) {
 try {
  if (typeof value !== 'string' || value.length > 1024) return false;
  const parts = value.split('.'); if (parts.length !== 2) return false;
  const signature = unb64(parts[1]); if (signature.length !== 32) return false;
  if (!await crypto.subtle.verify('HMAC', await signingKey(config), signature, message(parts[0]))) return false;
  const data = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(unb64(parts[0])));
  if (!data || Object.keys(data).sort().join(',') !== 'aud,exp,iat,nonce,v') return false;
  return data.v === 1 && data.aud === origin && /^[A-Za-z0-9_-]{22}$/.test(data.nonce)
   && Number.isSafeInteger(data.iat) && Number.isSafeInteger(data.exp) && data.iat <= now && data.iat >= 0
   && data.exp > now && data.exp > data.iat && data.exp - data.iat <= Math.min(config.seconds, MAX_SECONDS);
 } catch { return false; }
}
export function readSessionCookie(request) {
 const header = request.headers.get('cookie') ?? ''; if (header.length > 16384) return null;
 const matches = header.split(';').map(x => x.trim()).filter(x => x.startsWith(COOKIE_NAME + '='));
 // Duplicate cookie names are ambiguous; fail closed, including cookie tossing.
 return matches.length === 1 ? matches[0].slice(COOKIE_NAME.length + 1) : null;
}
export const sessionCookie = (value, seconds) => `${COOKIE_NAME}=${value}; Max-Age=${seconds}; Path=/; HttpOnly; Secure; SameSite=Strict`;
export function protectedHeaders(extra = {}) {
 return new Headers({'Cache-Control': 'private, no-store, max-age=0', 'CDN-Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store',
  'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', ...extra});
}
function screen(status = 401, message = 'Enter your private access key to open AtlasNote.') {
 // Only fixed application-owned messages are passed here. No request or secret data is rendered.
 const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unlock AtlasNote</title><style>html{font:17px/1.5 system-ui,sans-serif;background:#f5f7fb;color:#202b3c}body{margin:0;min-height:100svh;display:grid;place-items:center}main{box-sizing:border-box;margin:1rem;padding:2rem;max-width:28rem;width:calc(100% - 2rem);border:1px solid #d6dfeb;border-radius:1rem;background:white}h1{margin-top:0}label,input,button{display:block;width:100%;box-sizing:border-box}input,button{font:inherit;border:1px solid #8899ad;border-radius:.4rem;padding:.7rem;margin:.5rem 0 1rem}button{background:#2457a5;color:white;cursor:pointer}input:focus-visible,button:focus-visible{outline:3px solid #1678d3;outline-offset:3px}small{display:block;color:#47576c}</style></head><body><main><h1>AtlasNote</h1><p role="status">${message}</p>${status === 503 ? '<p>Ask the site owner to check the server-side access configuration.</p>' : `<form method="post" action="${UNLOCK_PATH}"><label for="access-key">Access key</label><input id="access-key" name="accessKey" type="password" autocomplete="current-password" autocapitalize="none" spellcheck="false" required maxlength="64"><button type="submit">Unlock AtlasNote</button></form><small>This browser is remembered by a secure session cookie. The site does not read local key files.</small>`}</main></body></html>`;
 return new Response(body, {status, headers: protectedHeaders({'Content-Type': 'text/html; charset=utf-8',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"})});
}
export const unavailable = () => screen(503, 'AtlasNote is locked: access verification is unavailable.');
function sameOriginPost(request) {
 const origin = new URL(request.url).origin;
 return request.method === 'POST' && new URL(request.url).protocol === 'https:' && request.headers.get('origin') === origin
  && !['cross-site', 'none'].includes(request.headers.get('sec-fetch-site'));
}
async function readSmallForm(request) {
 if (!/^application\/x-www-form-urlencoded(?:;\s*charset=utf-8)?$/i.test(request.headers.get('content-type') ?? '')) throw Error('Invalid form');
 const declared = request.headers.get('content-length');
 if (declared && (!/^\d+$/.test(declared) || Number(declared) > 4096)) throw Error('Invalid form');
 if (!request.body) throw Error('Invalid form');
 const reader = request.body.getReader(); const chunks = []; let length = 0;
 try { for (;;) { const {done, value} = await reader.read(); if (done) break; length += value.length; if (length > 4096) { await reader.cancel(); throw Error('Invalid form'); } chunks.push(value); } }
 finally { reader.releaseLock(); }
 const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
 const form = new URLSearchParams(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
 if (Array.from(form.keys()).join(',') !== 'accessKey') throw Error('Invalid form');
 return form.get('accessKey');
}
export async function gate(request, context, get) {
 try {
  const config = readAccessConfig(get);
  const url = new URL(request.url);
  if (url.protocol !== 'https:') return unavailable();
  if (!await verifySession(readSessionCookie(request), config, url.origin)) return screen();
  const response = await context.next();
  // Do not let a shared CDN or browser cache turn a previously authorized response into a bypass.
  const headers = new Headers(response.headers);
  for (const [key, value] of protectedHeaders()) {
   if (key === 'vary' && headers.has('vary')) headers.set('vary', headers.get('vary') + ', Cookie');
   else if (key.includes('cache-control') || !headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
 } catch { return unavailable(); }
}
export async function unlock(request, get) {
 try {
  const config = readAccessConfig(get);
  if (new URL(request.url).pathname !== UNLOCK_PATH || !sameOriginPost(request)) return screen(403, 'Unable to unlock. Check the key and try again.');
  let key; try { key = await readSmallForm(request); } catch { return screen(403, 'Unable to unlock. Check the key and try again.'); }
  if (!await matchesKey(key, config)) return screen(403, 'Unable to unlock. Check the key and try again.');
  const token = await issueSession(config, new URL(request.url).origin);
  return new Response(null, {status: 303, headers: protectedHeaders({'Location': '/', 'Set-Cookie': sessionCookie(token, config.seconds)})});
 } catch { return unavailable(); }
}
export async function lock(request, get) {
 try {
  readAccessConfig(get);
  if (new URL(request.url).pathname !== LOCK_PATH || !sameOriginPost(request)) return screen(403, 'Unable to lock this session. Use the AtlasNote Settings action.');
  return new Response(null, {status: 303, headers: protectedHeaders({'Location': '/', 'Set-Cookie': sessionCookie('', 0)})});
 } catch { return unavailable(); }
}
