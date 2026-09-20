/** Provider-neutral observations with Cloudflare as the active managed adapter.
 * These helpers do not authenticate users, own browser-local data, or create provider resources.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const ACTIVE_PROVIDER='cloudflare';
export const SECURITY_HEADERS=Object.freeze({
 'x-content-type-options':'nosniff',
 'referrer-policy':'no-referrer',
 'x-frame-options':'SAMEORIGIN',
 'permissions-policy':'camera=(), microphone=(), geolocation=()'
});
export const CACHE_HEADERS=Object.freeze({
 'cache-control':'private, no-store, max-age=0',
 'cdn-cache-control':'no-store',
 'cloudflare-cdn-cache-control':'no-store'
});

export function validateCloudflareConfig(config){
 assert(config&&typeof config==='object'&&!Array.isArray(config),'Missing Wrangler configuration');
 const allowed=new Set(['$schema','name','compatibility_date','workers_dev','preview_urls','assets']);
 for(const key of Object.keys(config))assert(allowed.has(key),'Unreviewed Cloudflare configuration key: '+key);
 assert.match(config.name??'',/^[a-z][a-z0-9-]{0,62}$/,'Worker name must be a stable lowercase Workers name');
 assert(/^20\d\d-\d\d-\d\d$/.test(config.compatibility_date??''),'Explicit compatibility_date required');
 assert.equal(config.workers_dev,true,'Disposable QA Worker must keep workers.dev available');
 assert.equal(config.preview_urls,true,'Version preview URLs must stay enabled');
 assert.deepEqual(Object.keys(config.assets??{}).sort(),['directory','not_found_handling']);
 assert.equal(config.assets.directory,'./dist');
 assert.equal(config.assets.not_found_handling,'single-page-application');
 return true;
}

export function validateStaticHeaders(text){
 assert.equal(typeof text,'string');
 const lines=text.split(/\r?\n/);
 const routes=lines.filter(line=>line.trim()&&!/^\s/.test(line)&&!line.trim().startsWith('#'));
 assert.deepEqual(routes,['/*'],'Only the global static-asset header rule is allowed in the active boundary');
 const headers={};
 for(const line of lines){
  const m=line.match(/^\s+([^:#][^:]*):\s*(.+?)\s*$/);if(!m)continue;
  const key=m[1].trim().toLowerCase();assert(!Object.hasOwn(headers,key),'Duplicate static header '+key);headers[key]=m[2].trim();
 }
 for(const [key,value] of Object.entries(SECURITY_HEADERS))assert.equal(headers[key],value,key);
 for(const [key,value] of Object.entries(CACHE_HEADERS))assert.equal(headers[key],value,key);
 return true;
}

export function previewOrigin(value,{workerName}={}){
 if(!value)throw Error('A fresh ATLAS_V23_PREVIEW_URL is required; there is no historical default.');
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||u.pathname!=='/'||!u.hostname.endsWith('.workers.dev'))throw Error('Use an exact HTTPS Cloudflare Worker version preview origin without path, credentials, query or fragment.');
 const label=u.hostname.split('.')[0];
 if(workerName){
  assert.match(workerName,/^[a-z][a-z0-9-]{0,62}$/,'Malformed Worker name');
  assert(label.endsWith('-'+workerName),'Preview URL belongs to a different Worker');
  assert.notEqual(label,workerName,'Use a versioned preview URL, not the production workers.dev hostname');
 }
 return u.origin;
}

export function validatePreviewMetadata(version,origin,{now=Date.now(),candidateTime=0,maxAgeMs=86400000,workerName,versionId,activeVersionIds=[]}={}){
 if(!Number.isFinite(maxAgeMs)||maxAgeMs<=0||maxAgeMs>86400000)throw Error('Preview freshness must be within 24 hours.');
 assert(version&&typeof version==='object','Missing live Cloudflare Worker version metadata');
 if(workerName)previewOrigin(origin,{workerName});else previewOrigin(origin);
 const id=version.id;
 assert(typeof id==='string'&&/^[0-9a-f-]{20,64}$/i.test(id),'Worker version ID missing or malformed');
 if(versionId)assert.equal(id,versionId,'Different Worker version');
 const metadata=version.metadata??{};
 const hasPreview=metadata.hasPreview??metadata.has_preview??version.hasPreview??version.has_preview;
 assert.equal(hasPreview,true,'Worker version has no preview URL');
 const createdRaw=metadata.created_on??version.created_on??metadata.modified_on??version.modified_on;
 const created=Date.parse(createdRaw??'');
 assert(Number.isFinite(created)&&created>=candidateTime&&created<=now+300000&&now-created<=maxAgeMs,'Stale version, future timestamp, or version predating the candidate');
 assert(!activeVersionIds.includes(id),'Candidate version is actively deployed; qualification requires a preview-only version');
 return {id,number:version.number??null,createdOn:new Date(created).toISOString(),hasPreview:true,source:metadata.source??version.source??null,workerName:workerName??null,activeDeploymentContainsVersion:false};
}

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

export function scopedServiceHeaders(url,origin,clientId,clientSecret){
 const u=new URL(url);assert.equal(u.origin,origin,'Never send Access credentials to another origin');
 assert(!u.username&&!u.password&&!u.search&&!u.hash,'Credential-bearing or query URLs are forbidden');
 assert(typeof clientId==='string'&&clientId.length>=8&&!/[\r\n]/.test(clientId),'Access Client ID missing or malformed');
 assert(typeof clientSecret==='string'&&clientSecret.length>=16&&!/[\r\n]/.test(clientSecret),'Access Client Secret missing or malformed');
 return {'CF-Access-Client-Id':clientId,'CF-Access-Client-Secret':clientSecret};
}

export function safeHeaders(headers){
 const names=[...Object.keys(SECURITY_HEADERS),...Object.keys(CACHE_HEADERS),'content-type','cf-cache-status'];
 return Object.fromEntries(names.map(k=>[k,headers.get(k)]).filter(([,v])=>v!==null));
}

export function headersAreSafe(headers){
 return Object.entries(SECURITY_HEADERS).every(([k,v])=>headers[k]===v)
  &&/\bprivate\b/i.test(headers['cache-control']??'')
  &&/\bno-store\b/i.test(headers['cache-control']??'')
  &&/\bno-store\b/i.test(headers['cdn-cache-control']??'')
  &&/\bno-store\b/i.test(headers['cloudflare-cdn-cache-control']??'');
}

export function isProtectedResponse(probe,expectedHash){
 if(probe.bodyHash===expectedHash||probe.appMarker)return false;
 if([401,403].includes(probe.status))return true;
 return [302,303,307,308].includes(probe.status)&&probe.redirectToAccess===true;
}

export function reportStatus(rows){return rows.some(r=>r.status==='FAIL')?'FAIL':rows.some(r=>r.status!=='PASS')?'BLOCKED':'PASS';}

export function secretFreeText(text,secrets=[]){
 for(const secret of secrets.filter(x=>typeof x==='string'&&x.length>=8)){
  for(const form of new Set([secret,encodeURIComponent(secret),Buffer.from(secret).toString('base64')]))text=text.split(form).join('[REDACTED]');
 }
 return text.replace(/([?&](?:token|code|state|client_secret)=)[^\s&#"']+/gi,'$1[REDACTED]');
}

/** Reject summarized, stale, incomplete, or different-run provider reports. */
export function freshProviderEvidence(report,expected,required){
 if(!report||report.status!=='PASS'||report.provider!==ACTIVE_PROVIDER||report.runId!==expected.runId)return false;
 if(report.source?.sourceCommit!==expected.sourceCommit||report.source?.sourceHash!==expected.sourceHash||report.source?.sourceDirty)return false;
 const start=Date.parse(report.startedAt),end=Date.parse(report.finishedAt),minimum=Date.parse(expected.startedAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<minimum||end<start||end>Date.now()+300000)return false;
 const rows=report.results;if(!Array.isArray(rows)||rows.length!==required.length)return false;
 return new Set(rows.map(r=>r.name)).size===required.length&&required.every(name=>rows.some(r=>r.name===name&&r.status==='PASS'));
}

/** Exact supplied credentials are checked in addition to pattern-based secret scanning. */
export function containsCredential(bytes,secrets){
 const data=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
 return secrets.filter(v=>typeof v==='string'&&v.length>=8).some(secret=>[secret,encodeURIComponent(secret),Buffer.from(secret).toString('base64')].some(form=>data.includes(Buffer.from(form))));
}
