/** Provider-neutral observations. These helpers do not authenticate users or own local data. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const SECURITY_HEADERS=Object.freeze({
 'x-content-type-options':'nosniff','referrer-policy':'no-referrer',
 'x-frame-options':'SAMEORIGIN','permissions-policy':'camera=(), microphone=(), geolocation=()'
});
export function validateVercelConfig(config){
 assert.equal(config.version,2);assert.equal(config.framework,'vite');
 assert.equal(config.installCommand,'npm ci');assert.equal(config.buildCommand,'npm run build');assert.equal(config.outputDirectory,'dist');
 const allowed=new Set(['$schema','version','framework','installCommand','buildCommand','outputDirectory','headers','rewrites']);
 for(const key of Object.keys(config))assert(allowed.has(key),'Unreviewed Vercel configuration key: '+key);
 assert.deepEqual(config.rewrites,[{source:'/(.*)',destination:'/index.html'}]);
 assert.equal(config.headers.length,1);assert.equal(config.headers[0].source,'/(.*)');
 const headers=Object.fromEntries(config.headers[0].headers.map(h=>[h.key.toLowerCase(),h.value]));
 assert.equal(Object.keys(headers).length,config.headers[0].headers.length,'Duplicate header keys');
 for(const [key,value] of Object.entries(SECURITY_HEADERS))assert.equal(headers[key],value,key);
 assert.equal(headers['cache-control'],'private, no-store, max-age=0');
 assert.equal(headers['cdn-cache-control'],'no-store');assert.equal(headers['vercel-cdn-cache-control'],'no-store');
 return true;
}
export function previewOrigin(value){
 if(!value)throw Error('A fresh ATLAS_V23_PREVIEW_URL is required; there is no historical default.');
 const u=new URL(value);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||u.pathname!=='/'||!u.hostname.endsWith('.vercel.app'))throw Error('Use an exact HTTPS Vercel deployment permalink without path, credentials, query or fragment.');
 return u.origin;
}
export function validatePreviewMetadata(meta,origin,{now=Date.now(),candidateTime=0,maxAgeMs=86400000,projectId}={}){
 if(!Number.isFinite(maxAgeMs)||maxAgeMs<=0||maxAgeMs>86400000)throw Error('Preview freshness must be within 24 hours.');
 assert(meta&&typeof meta==='object','Missing live Vercel deployment metadata');
 assert.equal(meta.url,new URL(origin).hostname,'Alias or different deployment is forbidden');
 assert(Object.hasOwn(meta,'target')&&(meta.target===null||meta.target==='preview'),'Production or unknown deployment target is forbidden');
 assert.equal(meta.readyState,'READY','Deployment is not READY');
 assert(/^dpl_[A-Za-z0-9]+$/.test(meta.id),'Deployment ID missing');
 const created=meta.createdAt??meta.created;
 assert(Number.isFinite(created)&&created>=candidateTime&&created<=now+300000&&now-created<=maxAgeMs,'Stale deployment, future timestamp, or deployment predating the candidate');
 const actualProject=meta.projectId??meta.project?.id;
 assert(/^prj_[A-Za-z0-9]+$/.test(actualProject??''),'Missing project identity');
 if(projectId)assert.equal(actualProject,projectId,'Different project');
 return {id:meta.id,url:meta.url,target:meta.target,readyState:meta.readyState,createdAt:created,projectId:actualProject};
}
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function scopedBypassHeaders(url,origin,secret){
 const u=new URL(url);assert.equal(u.origin,origin,'Never send a bypass to another origin');
 assert(!u.username&&!u.password&&!u.search&&!u.hash,'Credential-bearing or query URLs are forbidden');
 assert(typeof secret==='string'&&secret.length>=16&&!/[\r\n]/.test(secret),'Automation bypass missing or malformed');
 return {'x-vercel-protection-bypass':secret};
}
export function safeHeaders(headers){
 const names=[...Object.keys(SECURITY_HEADERS),'cache-control','cdn-cache-control','content-type','x-vercel-cache'];
 return Object.fromEntries(names.map(k=>[k,headers.get(k)]).filter(([,v])=>v!==null));
}
export function headersAreSafe(headers){
 return Object.entries(SECURITY_HEADERS).every(([k,v])=>headers[k]===v)&&/\bprivate\b/i.test(headers['cache-control']??'')&&/\bno-store\b/i.test(headers['cache-control']??'');
}
export function isProtectedResponse(probe,expectedHash){
 if(probe.bodyHash===expectedHash||probe.appMarker)return false;
 if([401,403].includes(probe.status))return true;
 return [302,303,307,308].includes(probe.status)&&probe.redirectToVercel===true;
}
export function reportStatus(rows){return rows.some(r=>r.status==='FAIL')?'FAIL':rows.some(r=>r.status!=='PASS')?'BLOCKED':'PASS';}
export function secretFreeText(text,secrets=[]){
 for(const secret of secrets.filter(x=>typeof x==='string'&&x.length>=8)){
  for(const form of new Set([secret,encodeURIComponent(secret),Buffer.from(secret).toString('base64')]))text=text.split(form).join('[REDACTED]');
 }
 // Do not retain credential query strings, including share URLs and bypass cookies.
 return text.replace(/([?&](?:_vercel_share|x-vercel-protection-bypass|token|code|state)=)[^\s&#"']+/gi,'$1[REDACTED]');
}
/** Reject summarized, stale, incomplete, or different-run provider reports. */
export function freshProviderEvidence(report,expected,required){
 if(!report||report.status!=='PASS'||report.provider!=='vercel'||report.runId!==expected.runId)return false;
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
