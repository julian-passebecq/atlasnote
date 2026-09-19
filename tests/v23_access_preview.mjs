/** Anonymous provider evidence, bound to this exact candidate; never credentials. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {PROVIDER_CASES} from '../tools/v23-release-contract.mjs';
import {sourceIdentity} from '../tools/check-v23-build.mjs';
const out=process.env.ATLAS_EVIDENCE??'docs/evidence/v23/access-preview';
fs.mkdirSync(out,{recursive:true});
const source=sourceIdentity(),results=[],mutationsPerformed=[];
const target=process.env.ATLAS_V23_PREVIEW_URL;
let identity=null;
function finish(reason){
 for(const name of PROVIDER_CASES)if(!results.some(r=>r.name===name))results.push({name,status:'BLOCKED',reason:reason??'Configured-session/configuration-rotation/provider cleanup qualification has not been executed. Anonymous rejection is not that proof.'});
 const status=results.some(r=>r.status==='FAIL')?'FAIL':results.every(r=>r.status==='PASS')?'PASS':'BLOCKED';
 const report={...source,status,target:target??null,identity,nonProductionOnly:true,mutationsPerformed,credentialsCreated:false,results};
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));process.exitCode=status==='PASS'?0:status==='FAIL'?1:2;
}
async function json(url){const response=await fetch(url,{headers:{Accept:'application/vnd.github+json',...(process.env.ATLAS_GITHUB_READ_TOKEN?{Authorization:'Bearer '+process.env.ATLAS_GITHUB_READ_TOKEN}:{})},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Public candidate identity lookup HTTP '+response.status);return response.json();}
async function run(){
 if(source.sourceDirty){finish('A clean exact-candidate checkout is required for provider qualification.');return;}
 if(!target){finish('Explicit disposable preview URL was not provided. No old preview or production fallback is permitted.');return;}
 const u=new URL(target),match=/^deploy-preview-([0-9]+)--atlasnotej\.netlify\.app$/.exec(u.hostname);
 if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/'||!match)throw Error('Only an explicit disposable AtlasNote HTTPS Deploy Preview is permitted; production is forbidden.');
 const api='https://api.github.com/repos/julian-passebecq/atlasnote';
 const [statuses,comments]=await Promise.all([json(api+'/commits/'+source.sourceCommit+'/status'),json(api+'/issues/'+match[1]+'/comments?per_page=100')]);
 const status=statuses.statuses.find(r=>r.context==='netlify/atlasnotej/deploy-preview'&&r.state==='success'&&new URL(r.target_url).origin===u.origin);
 const comment=comments.find(c=>c.user?.login==='netlify[bot]'&&c.body.includes(source.sourceCommit));
 const deployId=comment?.body.match(/https:\/\/app\.netlify\.com\/projects\/atlasnotej\/deploys\/([a-f0-9]{24})/)?.[1];
 if(!status||!deployId){finish('Provider status/comment does not establish that this preview is built from the exact current SHA. No HTTP observation was credited.');return;}
 const immutable=new URL('https://'+deployId+'--atlasnotej.netlify.app/');
 identity={sourceCommit:source.sourceCommit,reviewId:Number(match[1]),deployId,alias:u.origin,immutableOrigin:immutable.origin,statusId:status.id,commentId:comment.id};
 results.push({name:'Exact current candidate preview identity',status:'PASS',...identity});
 const files=[];function walk(dir){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else files.push(p.replaceAll('\\','/').replace(/^dist\//,''));}}walk('dist');
 const pick=pattern=>files.find(p=>pattern.test(p));
 const routes=[...new Set(['','index.html','build-identity.json','content.json','workspace/5/history/old',pick(/\.css$/),pick(/\.js$/),pick(/pdf\.worker.*\.mjs$/),pick(/\.pdf$/),'__atlasnote_unlock','__atlasnote_lock'].filter(p=>p!==undefined))];
 const observations=[];
 async function probe(origin,route,method='GET',headers={}){
  const r=await fetch(new URL(route,origin),{method,redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'Cache-Control':'no-cache',...headers},...(method==='POST'?{body:''}:{})});
  const bytes=new Uint8Array(await r.arrayBuffer());
  return {origin:origin.origin,route,method,status:r.status,cacheControl:r.headers.get('cache-control'),noStore:/no-store/i.test(r.headers.get('cache-control')??''),bodyBytes:bytes.length,bodySHA256:crypto.createHash('sha256').update(bytes).digest('hex'),setCookiePresent:r.headers.has('set-cookie'),clearSiteDataPresent:r.headers.has('clear-site-data')};
 }
 for(const origin of [immutable,u])for(const route of routes){
  try{const r=await probe(origin,route);observations.push(r);const denied=[401,403,405,503].includes(r.status);results.push({name:'Anonymous GET '+origin.origin+'/'+route,status:denied&&r.noStore&&!r.setCookiePresent&&!r.clearSiteDataPresent?'PASS':'FAIL',observation:r,scope:'Exact-candidate anonymous denial only; not authenticated-cache, expiry or configured-verifier proof'});}
  catch(e){results.push({name:'Anonymous GET '+origin.origin+'/'+route,status:'BLOCKED',reason:'Transport failure is not fail-closed authentication evidence',error:e.cause?.code??e.code??e.name});}
 }
 const methodRows=observations.filter(r=>r.route==='__atlasnote_unlock'||r.route==='__atlasnote_lock');
 if(methodRows.length===4&&methodRows.every(r=>r.status===405&&r.noStore&&!r.setCookiePresent))results.push({name:'get-unlock-lock',status:'PASS',scope:'Both GET endpoints reject with 405/no-store on alias and immutable deploy'});
 const cross=[];
 for(const route of ['__atlasnote_unlock','__atlasnote_lock'])try{cross.push(await probe(immutable,route,'POST',{Origin:'https://cross-origin-qa.invalid','Content-Type':'application/x-www-form-urlencoded'}));}catch(e){results.push({name:'Cross-origin transport /'+route,status:'BLOCKED',error:e.cause?.code??e.name});}
 if(cross.length===2)results.push({name:'cross-origin-unlock-lock',status:cross.every(r=>r.status===403&&r.noStore&&!r.setCookiePresent&&!r.clearSiteDataPresent)?'PASS':'FAIL',observations:cross});
 finish();
}
try{await run();}catch(e){results.push({name:'Exact disposable preview prerequisite',status:'BLOCKED',error:e.message});finish();}
