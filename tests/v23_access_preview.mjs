/** Fresh, read-only provider qualification. No deployment writes, token output or historical fallbacks. */
import fs from 'node:fs';import path from 'node:path';import {randomUUID,randomBytes} from 'node:crypto';import {spawnSync,execFileSync} from 'node:child_process';
import {PROVIDER_CASES} from '../tools/v23-release-contract.mjs';
import {checkCandidateBuild} from '../tools/check-v23-build.mjs';
import {previewOrigin,validatePreviewMetadata,scopedBypassHeaders,safeHeaders,sha256,headersAreSafe,isProtectedResponse,reportStatus,secretFreeText,containsCredential} from '../tools/provider-access-contract.mjs';
const out=path.resolve(process.env.ATLAS_EVIDENCE??'docs/evidence/v23/access-preview');fs.mkdirSync(out,{recursive:true});
const runId=process.env.ATLAS_V23_RUN_ID??randomUUID(),startedAt=new Date().toISOString();
const apiToken=process.env.VERCEL_TOKEN,bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const secrets=[apiToken,bypass],rows=new Map(PROVIDER_CASES.map(name=>[name,{name,status:'BLOCKED',reason:'Not executed in this run.'}]));
let origin=null,deployment=null,build=null;
const add=(name,ok,detail={})=>{if(!rows.has(name))throw Error('Unknown provider case');rows.set(name,{name,status:ok?'PASS':'FAIL',...detail});};
const block=(reason)=>{for(const [name,row] of rows)if(row.status==='BLOCKED')rows.set(name,{name,status:'BLOCKED',reason});};
function save(){
 const results=[...rows.values()],report={schemaVersion:1,runId,startedAt,finishedAt:new Date().toISOString(),provider:'vercel',scope:'Fresh protected preview only; live HTTP plus browser, never historical evidence.',status:reportStatus(results),source:build,target:origin,deployment,mutationsPerformed:[],productionTouched:false,counts:Object.fromEntries(['PASS','BLOCKED','FAIL'].map(s=>[s,results.filter(r=>r.status===s).length])),results};
 fs.writeFileSync(path.join(out,'results.json'),secretFreeText(JSON.stringify(report,null,2),secrets)+'\n');
 console.log(JSON.stringify({status:report.status,counts:report.counts,evidence:'results.json'},null,2));process.exitCode=report.status==='PASS'?0:report.status==='FAIL'?1:2;
}
function leakedCredentials(){
 const files=new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean));
 function walk(dir){if(!fs.existsSync(dir))return;for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else if(item.isFile())files.add(file);}}
 walk('dist');walk(out);
 return [...files].filter(file=>fs.existsSync(file)&&containsCredential(fs.readFileSync(file),secrets));
}
async function probe(relative,authorized=false,invalid=false){
 const url=new URL(relative,origin+'/');
 if(url.origin!==origin||url.search||url.hash)throw Error('Probe escaped the approved origin');
 const headers=authorized?scopedBypassHeaders(url,origin,invalid?'invalid-'+randomBytes(24).toString('hex'):bypass):{};
 const response=await fetch(url,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(15000)});
 const bytes=Buffer.from(await response.arrayBuffer());
 let redirectToVercel=false;
 if(response.headers.has('location')){const u=new URL(response.headers.get('location'),origin);redirectToVercel=u.protocol==='https:'&&(u.hostname==='vercel.com'||u.hostname.endsWith('.vercel.com'));}
 // Retain no body, Set-Cookie, auth header, or login URL/state.
 return {status:response.status,headers:safeHeaders(response.headers),bodyHash:sha256(bytes),bodyBytes:bytes.length,appMarker:bytes.includes(Buffer.from('id="root"'))&&bytes.includes(Buffer.from('/assets/')),redirectToVercel,bytes};
}
function evidence(p){const {bytes,...safe}=p;return safe;}
try{
 if((process.env.ATLAS_V23_PROVIDER??'vercel')!=='vercel')throw Error('Only the active managed Vercel adapter is supported here. Legacy Netlify has a separate optional command.');
 build=checkCandidateBuild();
 origin=previewOrigin(process.env.ATLAS_V23_PREVIEW_URL);
 if(build.status!=='PASS')throw Error('A clean, current integrated build is required before provider qualification.');
 if(!apiToken||!bypass)throw Error('VERCEL_TOKEN and VERCEL_AUTOMATION_BYPASS_SECRET are required in process environment. No secrets were created or requested in chat.');
 const beforeLeaks=leakedCredentials();if(beforeLeaks.length){add('automation-secret-scope',false,{paths:beforeLeaks,reason:'A supplied credential exists in source, public build or retained evidence.'});throw Error('Credential leak detected; provider probes refused.');}
 const metadataUrl=new URL('https://api.vercel.com/v13/deployments/'+encodeURIComponent(new URL(origin).hostname));
 if(process.env.ATLAS_VERCEL_TEAM_ID)metadataUrl.searchParams.set('teamId',process.env.ATLAS_VERCEL_TEAM_ID);
 const response=await fetch(metadataUrl,{headers:{Authorization:'Bearer '+apiToken},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Live deployment metadata unavailable (HTTP '+response.status+').');
 const candidateTime=Number(execFileSync('git',['show','-s','--format=%ct','HEAD'],{encoding:'utf8'}).trim())*1000;
 try{deployment=validatePreviewMetadata(await response.json(),origin,{candidateTime,projectId:process.env.ATLAS_VERCEL_PROJECT_ID});add('ready-preview',true,{deployment});}
 catch(e){add('ready-preview',false,{reason:e.message});throw Error('Refused an unqualified, stale or production target; no app probes were sent.');}
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
 add('fail-closed-protection',isProtectedResponse(invalidRoot,rootHash)&&isProtectedResponse(invalidAsset,assetHash),{scope:'Absent and invalid automation authorization are denied by the managed platform; no invented vendor handler errors.',invalidRoot:evidence(invalidRoot),invalidAsset:evidence(invalidAsset)});
 if([...rows.values()].some(r=>r.status==='FAIL'))throw Error('HTTP/provider contract failed; refusing browser qualification against a leaking or mismatched candidate.');
 const browserEnv={...process.env,ATLAS_EVIDENCE:out,ATLAS_V23_RUN_ID:runId};delete browserEnv.VERCEL_TOKEN;
 const child=spawnSync(process.env.ATLAS_PYTHON??'python',['tests/v23_provider_browser.py'],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024,env:browserEnv});
 fs.writeFileSync(path.join(out,'browser.log'),secretFreeText((child.stdout??'')+(child.stderr??''),secrets));
 const reportPath=path.join(out,'browser-results.json');
 if(!fs.existsSync(reportPath))throw Error('Provider browser produced no fresh evidence.');
 const browser=JSON.parse(fs.readFileSync(reportPath));
 if(browser.runId!==runId||browser.sourceHash!==build.sourceHash||browser.target!==origin||Date.parse(browser.startedAt)<Date.parse(startedAt))throw Error('Rejected stale or different-candidate browser evidence.');
 for(const name of ['auth-state-idb','automation-secret-scope','browser-sanity']){
  const row=browser.results.find(r=>r.name===name);if(row)rows.set(name,row);
 }
 const leaks=leakedCredentials();if(leaks.length)add('automation-secret-scope',false,{paths:leaks,reason:'Supplied credential found in retained output; do not distribute or release.'});
 if(child.status!==0||child.signal||child.error){for(const name of ['auth-state-idb','automation-secret-scope','browser-sanity'])if(rows.get(name).status==='PASS')rows.set(name,{name,status:'BLOCKED',reason:'Browser process did not finish successfully.'});}
}catch(e){block(secretFreeText(e.message,secrets));}
finally{save();}
