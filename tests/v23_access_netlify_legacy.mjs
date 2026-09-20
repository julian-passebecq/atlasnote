/** Non-mutating, anonymous preview probes. Never creates, logs or sends credentials. */
import fs from 'node:fs';import path from 'node:path';
import {PROVIDER_CASES} from '../tools/legacy-netlify-contract.mjs';import {sourceIdentity} from '../tools/check-v23-build.mjs';
const out=process.env.ATLAS_EVIDENCE??'docs/evidence/v23/access-preview';fs.mkdirSync(out,{recursive:true});
const target=process.env.ATLAS_V23_NETLIFY_PREVIEW_URL;
if(!target)throw Error('Set ATLAS_V23_NETLIFY_PREVIEW_URL explicitly; no historical preview fallback is permitted.');
const u=new URL(target);
if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||!(/^(?:deploy-preview-[0-9]+|[a-f0-9]{24})--atlasnotej\.netlify\.app$/).test(u.hostname))throw Error('Only the disposable AtlasNote HTTPS preview/permalink is permitted. Production is forbidden.');
const files=[];function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p.replaceAll('\\','/').replace(/^dist\//,''));}}walk('dist');
const pick=pattern=>files.find(p=>pattern.test(p));
const routes=[...new Set(['','index.html','build-identity.json','content.json','workspace/5/history/old',pick(/\.css$/),pick(/\.js$/),pick(/pdf\.worker.*\.mjs$/),pick(/\.pdf$/),'__atlasnote_unlock','__atlasnote_lock'].filter(p=>p!==undefined))];
const results=[];
for(const route of routes){try{const response=await fetch(new URL(route,u),{method:'GET',redirect:'manual',signal:AbortSignal.timeout(6000),headers:{'Cache-Control':'no-cache'}});const body=await response.text();const terminal=route==='__atlasnote_unlock'||route==='__atlasnote_lock';const rejected=[401,403,405,503].includes(response.status);const noStore=/no-store/i.test(response.headers.get('cache-control')??'');
 const status=!rejected?'FAIL':!noStore?'FAIL':response.status===503||terminal?'PASS':'BLOCKED';
 results.push({name:'Anonymous GET /'+route,status,httpStatus:response.status,cacheControl:response.headers.get('cache-control'),bodyBytes:Buffer.byteLength(body),reason:status==='PASS'?'Denied without static app content; credential/configured-session cases remain unqualified':status==='FAIL'?'Anonymous route was not safely rejected/no-store; do not ship':'Locked, but the runtime missing-config condition is not independently established'});
 }catch(e){results.push({name:'Anonymous GET /'+route,status:'BLOCKED',reason:'HTTP probe could not complete; transport failure is NOT authentication proof',error:e.cause?.code??e.code??e.name});}}
for(const name of PROVIDER_CASES)results.push({name,status:'BLOCKED',reason:'Full disposable provider qualification not executed. No preview credentials were created/configured, no write/deploy operation performed; discovery alone is not behavior proof.'});
const report={...sourceIdentity(),status:results.some(r=>r.status==='FAIL')?'FAIL':'BLOCKED',target:u.origin,nonProductionOnly:true,mutationsPerformed:[],credentialsCreated:false,results};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.status==='FAIL'?1:2;
