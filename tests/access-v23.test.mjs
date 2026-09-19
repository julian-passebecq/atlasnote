/** Real Web Crypto and Request/Response tests, not provider/CDN/browser evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {readAccessConfig,matchesKey,issueSession,verifySession,readSessionCookie,sessionCookie,COOKIE_NAME,gate,unlock,lock,UNLOCK_PATH,LOCK_PATH} from '../netlify/lib/access.mjs';
import {generateAccessMaterial,saveOwnerKey} from '../tools/access-key-generate.mjs';
import {checkAccessBuild} from '../tools/check-access-build.mjs';
import authWrapper,{config as authConfig} from '../netlify/edge-functions/atlas-auth.js';
import unlockWrapper,{config as unlockConfig} from '../netlify/edge-functions/atlas-unlock.js';
import lockWrapper,{config as lockConfig} from '../netlify/edge-functions/atlas-lock.js';
const origin='https://atlasnote-test.invalid';
const material=generateAccessMaterial(); // Ephemeral test data: never logged or packaged.
const get=name=>name==='ATLASNOTE_ACCESS_KEY_SHA256'?material.verifier:undefined;
const config=readAccessConfig(get);
const request=(url='/',headers={},method='GET',body)=>new Request(origin+url,{method,headers,body});
const post=(key=material.key,extra={})=>request(UNLOCK_PATH,{'origin':origin,'content-type':'application/x-www-form-urlencoded','sec-fetch-site':'same-origin',...extra},'POST',new URLSearchParams({accessKey:key}).toString());
const assertNoLeak=async response=>{const body=await response.clone().text(),headers=JSON.stringify([...response.headers]);for(const secret of [material.key,material.verifier]){assert(!body.includes(secret));assert(!headers.includes(secret));}};

test('V23 T: helper generates independent 256-bit keys and SHA-256 verifiers',async()=>{
 const values=Array.from({length:64},generateAccessMaterial);assert.equal(new Set(values.map(v=>v.key)).size,64);
 for(const m of values){assert.match(m.key,/^atlas1_[A-Za-z0-9_-]{43}$/);assert.equal(Buffer.from(m.key.slice(7),'base64url').length,32);assert(await matchesKey(m.key,readAccessConfig(n=>n==='ATLASNOTE_ACCESS_KEY_SHA256'?m.verifier:undefined)));}
});
test('V23 T: valid key is checked by real SHA-256; invalid and malformed keys fail',async()=>{
 assert(await matchesKey(material.key,config));for(const key of [null,'',material.key+'x','wrong',generateAccessMaterial().key,'atlas1_'+'!'.repeat(43)])assert.equal(await matchesKey(key,config),false);
});
for(const [name,value]of [['missing',undefined],['empty',''],['short','abc'],['nonhex','z'.repeat(64)],['all-zero','0'.repeat(64)],['uppercase','A'.repeat(64)]])test('V23 T: '+name+' runtime verifier fails closed',async()=>{
 let next=0;const response=await gate(request(),{next(){next++;return new Response('SECRET_SHELL');}},()=>value);assert.equal(response.status,503);assert.equal(next,0);assert(!await response.text().then(t=>t.includes('SECRET_SHELL')));
});
for(const duration of ['0','91','30.0','-1','','NaN',' 30','30 '])test('V23 T: invalid session days '+JSON.stringify(duration)+' fail closed',()=>assert.throws(()=>readAccessConfig(n=>n==='ATLASNOTE_SESSION_DAYS'?duration:material.verifier)));
test('V23 T: default and bounded duration are explicit',()=>{assert.equal(config.seconds,30*86400);assert.equal(readAccessConfig(n=>n==='ATLASNOTE_SESSION_DAYS'?'90':material.verifier).seconds,90*86400);});
test('V23 T: signed session validates origin, expiry, tampering, age and rotation',async()=>{
 const token=await issueSession(config,origin,1000);assert(await verifySession(token,config,origin,1000));assert(await verifySession(token,config,origin,1000+config.seconds-1));
 for(const bad of ['',token+'.tail',token.slice(0,-3)+'abc',token.replace('.', '..'),'a.b','%.'+token])assert.equal(await verifySession(bad,config,origin,1000),false);
 assert.equal(await verifySession(token,config,origin,1000+config.seconds),false);assert.equal(await verifySession(token,config,origin,999),false);assert.equal(await verifySession(token,config,'https://other.invalid',1000),false);
 assert.equal(await verifySession(token,readAccessConfig(n=>n==='ATLASNOTE_ACCESS_KEY_SHA256'?generateAccessMaterial().verifier:undefined),origin,1001),false);
 assert.equal(await verifySession(token,{...config,seconds:86400},origin,1001),false);
});
test('V23 T: cookie scope and duplicate-cookie rejection',()=>{
 const cookie=sessionCookie('test-token',config.seconds);for(const part of ['__Host-atlasnote_session=','Max-Age=2592000','Path=/','HttpOnly','Secure','SameSite=Strict'])assert(cookie.includes(part));assert(!/domain=/i.test(cookie));
 assert.equal(readSessionCookie(request('/',{cookie:COOKIE_NAME+'=one'})),'one');assert.equal(readSessionCookie(request('/',{cookie:COOKIE_NAME+'=one; '+COOKIE_NAME+'=two'})),null);assert.equal(readSessionCookie(request('/',{cookie:'x'.repeat(17000)})),null);
});
for(const url of ['/','/index.html','/deep/notebook/123','/assets/private-looking.pdf','/pdf.worker.mjs','/app/main.js','/build-identity.json','/content.json'])test('V23 T: unauthenticated '+url+' never reaches static handler',async()=>{
 let next=0;const response=await gate(request(url),{next(){next++;return new Response('SHELL');}},get);assert.equal(response.status,401);assert.equal(next,0);assert.match(response.headers.get('cache-control'),/no-store/);await assertNoLeak(response);
});
test('V23 T: authenticated deep-link response preserves body and enforces no shared cache',async()=>{
 const token=await issueSession(config,origin);let next=0;const response=await gate(request('/deep/notebook',{cookie:COOKIE_NAME+'='+token}),{next(){next++;return new Response('AUTHORIZED',{headers:{'cache-control':'public,max-age=3600','vary':'Accept-Encoding','content-security-policy':"default-src 'self'"}});}},get);
 assert.equal(next,1);assert.equal(await response.text(),'AUTHORIZED');assert.match(response.headers.get('vary'),/Cookie/);assert.equal(response.headers.get('cdn-cache-control'),'no-store');assert.equal(response.headers.get('netlify-cdn-cache-control'),'no-store');assert.equal(response.headers.get('content-security-policy'),"default-src 'self'");
});
test('V23 T: missing environment adapter, thrown handler and HTTP all fail closed',async()=>{
 const token=await issueSession(config,origin);for(const r of [await gate(request(),{},()=>{throw Error('secret config error');}),await gate(request('/',{cookie:COOKIE_NAME+'='+token}),{next(){throw Error('secret handler error');}},get),await gate(new Request('http://atlasnote-test.invalid/'),{},get)]){assert.equal(r.status,503);await assertNoLeak(r);assert(!await r.text().then(t=>t.includes('secret ')));}
});
test('V23 T: successful POST issues secure cookie; it is never a client-readable key',async()=>{
 const r=await unlock(post(),get);assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/');const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);assert(!cookie.includes(material.key));const token=cookie.split(';')[0].split('=')[1];assert(await verifySession(token,config,origin));await assertNoLeak(r);
});
for(const scenario of ['wrong-key','malformed','cross-origin','missing-origin','get','wrong-path','json','duplicate-field','huge-body','hostile-fetch-site'])test('V23 T: unlock rejects '+scenario,async()=>{
 let r=post();if(scenario==='wrong-key')r=post(generateAccessMaterial().key);if(scenario==='malformed')r=post('not-a-key');if(scenario==='cross-origin')r=post(material.key,{origin:'https://attacker.invalid'});if(scenario==='missing-origin'){r=post();r.headers.delete('origin');}if(scenario==='get')r=request(UNLOCK_PATH);if(scenario==='wrong-path')r=request('/wrong',{'origin':origin,'content-type':'application/x-www-form-urlencoded'},'POST','accessKey='+material.key);if(scenario==='json')r=post(material.key,{'content-type':'application/json'});if(scenario==='duplicate-field')r=request(UNLOCK_PATH,{'origin':origin,'content-type':'application/x-www-form-urlencoded'},'POST','accessKey='+material.key+'&accessKey='+material.key);if(scenario==='huge-body')r=post('a'.repeat(5000));if(scenario==='hostile-fetch-site')r=post(material.key,{'sec-fetch-site':'cross-site'});
 const response=await unlock(r,get);assert.equal(response.status,403);assert.equal(response.headers.get('set-cookie'),null);await assertNoLeak(response);
});
test('V23 T: logout only expires cookie and never clears browser data',async()=>{
 const r=await lock(request(LOCK_PATH,{'origin':origin},'POST'),get);assert.equal(r.status,303);assert.match(r.headers.get('set-cookie'),/Max-Age=0/);assert.equal(r.headers.get('clear-site-data'),null);assert.equal(await r.text(),'');assert.equal((await lock(request(LOCK_PATH),get)).status,403);
});
test('V23 T/U: deployed wrappers use runtime environment, default fail and one free-compatible rule',async()=>{
 assert.deepEqual(authConfig,{path:'/*',excludedPath:[UNLOCK_PATH,LOCK_PATH],onError:'fail'});assert.deepEqual(unlockConfig.rateLimit,{windowLimit:5,windowSize:60,aggregateBy:['ip','domain']});assert.equal(unlockConfig.onError,'fail');assert.equal(lockConfig.onError,'fail');
 const old=globalThis.Netlify;globalThis.Netlify={env:{get}};try{assert.equal((await authWrapper(request(),{next(){throw Error('Must not run');}})).status,401);assert.equal((await unlockWrapper(post())).status,303);assert.equal((await lockWrapper(request(LOCK_PATH,{origin},'POST'))).status,303);}finally{if(old===undefined)delete globalThis.Netlify;else globalThis.Netlify=old;}
 assert.equal((await checkAccessBuild()).status,'PASS');
});
test('V23 T/W: helper refuses CI/redirected output without emitting any secret',()=>{
 const r=spawnSync(process.execPath,['tools/access-key-generate.mjs'],{env:{...process.env,CI:'1'},encoding:'utf8'});assert.notEqual(r.status,0);assert.equal(r.stdout,'');assert(!/atlas1_[A-Za-z0-9_-]{43}/.test(r.stderr));
});
test('V23 T/W: owner-only file is exclusive, private and not overwritten (temporary test home)',async()=>{
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-key-test-'));const previous=process.env.HOME;process.env.HOME=home;
 try {const filename=await saveOwnerKey(material.key);assert.equal(filename,path.join(home,'.atlasnote','access-key.txt'));assert.equal(await fs.readFile(filename,'utf8'),material.key+'\n');if(process.platform!=='win32'){assert.equal((await fs.stat(filename)).mode&0o777,0o600);assert.equal((await fs.stat(path.dirname(filename))).mode&0o777,0o700);}await assert.rejects(()=>saveOwnerKey(generateAccessMaterial().key));assert.equal(await fs.readFile(filename,'utf8'),material.key+'\n');}
 finally{if(previous===undefined)delete process.env.HOME;else process.env.HOME=previous;await fs.rm(home,{recursive:true,force:true});}
});
test('V23 T/W: a symlinked key directory is rejected',async()=>{
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-key-link-test-')),target=await fs.mkdtemp(path.join(os.tmpdir(),'atlas-key-link-target-')),previous=process.env.HOME;process.env.HOME=home;
 try{await fs.symlink(target,path.join(home,'.atlasnote'));await assert.rejects(()=>saveOwnerKey(material.key));assert.deepEqual(await fs.readdir(target),[]);}finally{if(previous===undefined)delete process.env.HOME;else process.env.HOME=previous;await fs.rm(home,{recursive:true,force:true});await fs.rm(target,{recursive:true,force:true});}
});
test('V23 W: ephemeral test key and verifier are absent from all client distribution files',async()=>{
 const walk=async dir=>{for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else {const bytes=await fs.readFile(p);assert(!bytes.includes(Buffer.from(material.key)),p);assert(!bytes.includes(Buffer.from(material.verifier)),p);}}};await walk('dist-offline');
});
