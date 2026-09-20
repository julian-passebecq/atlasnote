/** Fresh, read-only Cloudflare provider qualification. No deployment writes, token output or historical fallbacks. */
import fs from 'node:fs';import path from 'node:path';import {randomUUID,randomBytes} from 'node:crypto';import {spawnSync,execFileSync} from 'node:child_process';
import {PROVIDER_CASES} from '../tools/v23-release-contract.mjs';
import {checkCandidateBuild} from '../tools/check-v23-build.mjs';
import {ACTIVE_PROVIDER,previewOrigin,validatePreviewMetadata,scopedServiceHeaders,safeHeaders,sha256,headersAreSafe,isProtectedResponse,reportStatus,secretFreeText,containsCredential} from '../tools/provider-access-contract.mjs';
const out=path.resolve(process.env.ATLAS_EVIDENCE??'docs/evidence/v23/access-preview');fs.mkdirSync(out,{recursive:true});
const runId=process.env.ATLAS_V23_RUN_ID??randomUUID(),startedAt=new Date().toISOString();
const apiToken=process.env.CLOUDFLARE_API_TOKEN,accountId=process.env.CLOUDFLARE_ACCOUNT_ID;
const clientId=process.env.CF_ACCESS_CLIENT_ID,clientSecret=process.env.CF_ACCESS_CLIENT_SECRET;
const workerName=process.env.ATLAS_CF_WORKER_NAME,versionId=process.env.ATLAS_CF_VERSION_ID;
const secrets=[apiToken,clientId,clientSecret],rows=new Map(PROVIDER_CASES.map(name=>[name,{name,status:'BLOCKED',reason:'Not executed in this run.'}]));
let origin=null,providerVersion=null,build=null;
const add=(name,ok,detail={})=>{if(!rows.has(name))throw Error('Unknown provider case');rows.set(name,{name,status:ok?'PASS':'FAIL',...detail});};
const block=(reason)=>{for(const [name,row] of rows)if(row.status==='BLOCKED')rows.set(name,{name,status:'BLOCKED',reason});};
function save(){
 const results=[...rows.values()],report={schemaVersion:2,runId,startedAt,finishedAt:new Date().toISOString(),provider:ACTIVE_PROVIDER,scope:'Fresh protected Cloudflare Worker version preview only; live HTTP plus browser, never historical evidence.',status:reportStatus(results),source:build,target:origin,providerVersion,workerName:workerName??null,mutationsPerformed:[],productionTouched:false,counts:Object.fromEntries(['PASS','BLOCKED','FAIL'].map(s=>[s,results.filter(r=>r.status===s).length])),results};
 fs.writeFileSync(path.join(out,'results.json'),secretFreeText(JSON.stringify(report,null,2),secrets)+'\n');
 console.log(JSON.stringify({status:report.status,counts:report.counts,evidence:'results.json'},null,2));process.exitCode=report.status==='PASS'?0:report.status==='FAIL'?1:2;
}
function leakedCredentials(){
 const files=new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
 function walk(dir){if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(item.isFile())files.add(file);}}
 walk('dist');walk(out);
 return [...files].filter(file=>fs.existsSync(file)&&containsCredential(fs.readFileSync(file),secrets));
}
async function providerGet(pathname){
 const url='https://api.cloudflare.com/client/v4'+pathname;
 const response=await fetch(url,{headers:{Authorization:'Bearer '+apiToken},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Cloudflare metadata unavailable (HTTP '+response.status+').');
 const payload=await response.json();if(payload?.success!==true)throw Error('Cloudflare metadata API returned unsuccessful response.');return payload.result;
}
async function probe(relative,authorized=false,invalid=false){
 const url=new URL(relative,origin+'/');
 if(url.origin!==origin||url.search||url.hash)throw Error('Probe escaped the approved origin');
 const badSecret='invalid-'+randomBytes(24).toString('hex');
 const headers=authorized?scopedServiceHeaders(url,origin,clientId,invalid?badSecret:clientSecret):{};
 const response=await fetch(url,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
 const bytes=Buffer.from(await response.arrayBuffer());
 let redirectToAccess=false;
 if(response.headers.has('location')){const u=new URL(response.headers.get('location'),origin);redirectToAccess=u.protocol==='https:'&&(u.hostname==='cloudflareaccess.com'||u.hostname.endsWith('.cloudflareaccess.com'));}
 // Retain no body, Set-Cookie, auth header, login URL/state or Access JWT.
 return {status:response.status,headers:safeHeaders(response.headers),bodyHash:sha256(bytes),bodyBytes:bytes.length,appMarker:bytes.includes(Buffer.from('id="root"'))&&bytes.includes(Buffer.from('/assets/')),redirectToAccess,bytes};
}
function evidence(p){const {bytes,...safe}=p;return safe;}
try{
 if((process.env.ATLAS_V23_PROVIDER??ACTIVE_PROVIDER)!==ACTIVE_PROVIDER)throw Error('Only the active managed Cloudflare adapter is supported here. Legacy provider material has separate historical status.');
 build=checkCandidateBuild();
 if(build.status!=='PASS')throw Error('A clean, current integrated build is required before provider qualification.');
 if(!apiToken||!accountId||!clientId||!clientSecret||!workerName||!versionId)throw Error('CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET, ATLAS_CF_WORKER_NAME and ATLAS_CF_VERSION_ID are required in process environment. No credentials are created or requested in chat.');
 origin=previewOrigin(process.env.ATLAS_V23_PREVIEW_URL,{workerName});
 const beforeLeaks=leakedCredentials();if(beforeLeaks.length){add('automation-secret-scope',false,{paths:beforeLeaks,reason:'A supplied credential exists in source, public build or retained evidence.'});throw Error('Credential leak detected; provider probes refused.');}
 const enc=s=>encodeURIComponent(s);
 const version=await providerGet('/accounts/'+enc(accountId)+'/workers/scripts/'+enc(workerName)+'/versions/'+enc(versionId));
 const deploymentResult=await providerGet('/accounts/'+enc(accountId)+'/workers/scripts/'+enc(workerName)+'/deployments');
 const deployments=Array.isArray(deploymentResult)?deploymentResult:(deploymentResult?.deployments??[]),active=deployments[0]??null;
 const activeVersionIds=(active?.versions??[]).map(v=>v.version_id??v.versionId).filter(Boolean);
 const candidateTime=Number(execFileSync('git',['show','-s','--format=%ct','HEAD'],{encoding:'utf8'}).trim())*1000;
 try{providerVersion=validatePreviewMetadata(version,origin,{candidateTime,workerName,versionId,activeVersionIds});add('ready-preview',true,{providerVersion,currentDeploymentId:active?.id??null});}
 catch(e){add('ready-preview',false,{reason:e.message});throw Error('Refused an unqualified, stale, wrong-Worker or actively deployed target; no app probes were sent.');}
 const html=fs.readFileSync('dist/index.html'),rootHash=sha256(html);
 const asset=html.toString().match(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/)?.[1];
 if(!asset||!fs.existsSync(path.join('dist',asset)))throw Error('Root-relative representative bundled asset not found in integrated output.');
 const assetHash=sha256(fs.readFileSync(path.join('dist',asset))),deep='/workspace/5/history/old';
 const aRoot=await probe('/');add('anonymous-root',isProtectedResponse(aRoot,rootHash),{probe:evidence(aRoot)});
 const aAsset=await probe(asset);add('anonymous-static',isProtectedResponse(aAsset,assetHash),{path:asset,probe:evidence(aAsset)});
 const aDeep=await probe(deep);add('anonymous-deep-link',isProtectedResponse(aDeep,rootHash),{path:deep,probe:evidence(aDeep)});
 const authRoot=await probe('/',true);add('authorized-root',authRoot.status===200&&authRoot.bodyHash===rootHash,{probe:evidence(authRoot)});
 const identity=await probe('/build-identity.json',true);
 let exact=false;
 try{const remote=JSON.parse(identity.bytes.toString());exact=identity.status===200&&JSON.stringify(remote)===JSON.stringify(build.buildIdentity);if(exact)fs.writeFileSync(path.join(out,'build-identity.json'),JSON.stringify(remote,null,2));}catch{}
 add('exact-build',exact,{expectedSourceHash:build.sourceHash,probe:evidence(identity)});
 const authAsset=await probe(asset,true),authDeep=await probe(deep,true);
 add('authorized-deep-link',authDeep.status===200&&authDeep.bodyHash===rootHash&&authAsset.status===200&&authAsset.bodyHash===assetHash,{path:deep,probe:evidence(authDeep),staticAsset:evidence(authAsset)});
 add('security-headers',[authRoot,authAsset,authDeep,identity].every(p=>headersAreSafe(p.headers)),{checked:['/','/build-identity.json',asset,deep],headers:[authRoot,identity,authAsset,authDeep].map(p=>p.headers)});
 const after=[];
 for(const [route,hash] of [['/',rootHash],[asset,assetHash],[deep,rootHash],['/build-identity.json',identity.bodyHash]])for(let n=0;n<2;n++){const p=await probe(route);after.push({path:route,protected:isProtectedResponse(p,hash),...evidence(p)});}
 add('cache-isolation',after.every(p=>p.protected),{observations:after,scope:'Same URLs requested anonymously after authorized warm-up, without a cache-busting query.'});
 const invalidRoot=await probe('/',true,true),invalidAsset=await probe(asset,true,true);
 add('fail-closed-protection',isProtectedResponse(invalidRoot,rootHash)&&isProtectedResponse(invalidAsset,assetHash),{scope:'Absent and invalid Cloudflare Access service-token authorization are denied by the managed platform.',invalidRoot:evidence(invalidRoot),invalidAsset:evidence(invalidAsset)});
 if([...rows.values()].some(r=>r.status==='FAIL'))throw Error('HTTP/provider contract failed; refusing browser qualification against a leaking or mismatched candidate.');
 const browserEnv={...process.env,ATLAS_EVIDENCE:out,ATLAS_V23_RUN_ID:runId};delete browserEnv.CLOUDFLARE_API_TOKEN;
 const child=spawnSync(process.env.ATLAS_PYTHON??'python',['tests/v23_provider_browser.py'],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024,env:browserEnv});
 fs.writeFileSync(path.join(out,'browser.log'),secretFreeText((child.stdout??'')+(child.stderr??''),secrets));
 const reportPath=path.join(out,'browser-results.json');
 if(!fs.existsSync(reportPath))throw Error('Provider browser produced no fresh evidence.');
 const browser=JSON.parse(fs.readFileSync(reportPath));
 if(browser.runId!==runId||browser.sourceHash!==build.sourceHash||browser.target!==origin||Date.parse(browser.startedAt)<Date.parse(startedAt))throw Error('Rejected stale or different-candidate browser evidence.');
 for(const name of ['auth-state-idb','automation-secret-scope','browser-sanity']){const row=browser.results.find(r=>r.name===name);if(row)rows.set(name,row);}
 const leaks=leakedCredentials();if(leaks.length)add('automation-secret-scope',false,{paths:leaks,reason:'Supplied credential found in retained output; do not distribute or release.'});
 if(child.status!==0||child.signal||child.error){for(const name of ['auth-state-idb','automation-secret-scope','browser-sanity'])if(rows.get(name).status==='PASS')rows.set(name,{name,status:'BLOCKED',reason:'Browser process did not finish successfully.'});}
}catch(e){block(secretFreeText(e.message,secrets));}
finally{save();}
