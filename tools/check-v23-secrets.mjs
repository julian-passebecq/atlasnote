/** Bounded secret/privacy scanner. Prints locations/rules, never matched values.
 * Known public fixtures are approved by exact baseline bytes, not merely filenames.
 * Historical diagnostic absolute paths are inventoried; live client paths are rejected.
 */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
import {sourceIdentity} from './check-v23-build.mjs';
export function secretRules(text){const rules=[];
 if(/atlas1_[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])/.test(text))rules.push('plaintext-access-key');
 if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))rules.push('private-key');
 if(/(?:ghp_|github_pat_)[A-Za-z0-9_]{30,}/.test(text))rules.push('github-token');
 if(/sk-(?:proj-)?[A-Za-z0-9_-]{32,}/.test(text))rules.push('api-token');
 if(/ATLASNOTE_(?:ACCESS_KEY_SHA256|SESSION_SECRET)["']?\s*[:=]\s*["']?[a-f0-9]{64}(?![a-f0-9])/i.test(text))rules.push('literal-runtime-verifier');
 if(/VITE_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|ACCESS_KEY|TOKEN)\s*[:=]\s*["'][^"']{16,}/.test(text))rules.push('vite-secret');
 if(/(?:VERCEL_TOKEN|VERCEL_AUTOMATION_BYPASS_SECRET)[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9_=-]{24,}/.test(text))rules.push('literal-vercel-credential');
 if(/vcp_[A-Za-z0-9_]{24,}/.test(text))rules.push('vercel-token');
 if(/[?&](?:_vercel_share|x-vercel-protection-bypass)=[A-Za-z0-9_-]{16,}/.test(text))rules.push('vercel-secret-url');
 return rules;
}
export function scanSecrets(){const source=sourceIdentity(),names=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))];
 const known=JSON.parse(fs.readFileSync('tools/v23-public-fixtures.json','utf8')).fixtures;
 const allowed=new Set(known.map(r=>r.sha256));const findings=[],mentions=[],absolutePaths=[],maps=[],inventory=[];
 function inspect(file,kind){if(!fs.existsSync(file)||!fs.statSync(file).isFile())return;
  const bytes=fs.readFileSync(file),name=file.replaceAll('\\','/');inventory.push({path:name,kind,bytes:bytes.length});
  if(/(?:^|\/)(?:\.env[^/]*|access-key[^/]*\.txt|\.(?:netlify|vercel)(?:\/|$)|\.atlasnote(?:\/|$))/.test(name))findings.push({path:name,rule:'private-file-path'});
  if(/\.(?:pdf|zip)$/i.test(name)){if(kind!=='evidence'&&!allowed.has(createHash('sha256').update(bytes).digest('hex')))findings.push({path:name,rule:'unapproved-binary-fixture'});return;}
  if(/\.(?:png|jpg|jpeg|webp|woff2?|ttf)$/i.test(name))return;
  const text=bytes.toString('utf8');for(const rule of secretRules(text))findings.push({path:name,rule});
  if(/atlas1_|ATLASNOTE_ACCESS_KEY_SHA256|access-key\.txt|VITE_.*SECRET/.test(text))mentions.push({path:name,kind,scope:'Identifier/reference inspected; not inherently a secret'});
  if(/\/(?:mnt\/data|home\/oai|Users\/)[^\s"'<>]*/.test(text)||/[A-Z]:[\\/](?:Users|PROJ)[\\/]/.test(text)){absolutePaths.push({path:name,kind});if(kind==='dist'||name.startsWith('src/')||name.startsWith('public/'))findings.push({path:name,rule:'local-absolute-path-in-client'});}
  if(kind==='dist'&&/ATLASNOTE_ACCESS_KEY_SHA256|ATLASNOTE_SESSION_SECRET|netlify\/lib\/access|VERCEL_TOKEN|VERCEL_AUTOMATION_BYPASS_SECRET|x-vercel-protection-bypass|_vercel_share/.test(text))findings.push({path:name,rule:'server-material-in-client'});
  if(name.endsWith('.map'))maps.push(name);
 }
 for(const name of names)inspect(name,'source');
 function walk(dir,kind){if(!fs.existsSync(dir))return;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,kind);else if(!p.endsWith('/secrets/results.json'))inspect(p,kind);}}
 walk('dist','dist');walk('docs/evidence','evidence');
 return {...source,status:findings.length?'FAIL':'PASS',scope:'Exact tracked/untracked nonignored source, present dist/maps and docs/evidence. Rule scan plus exact public PDF/ZIP fixture hashes; not a universal secret detector or live-provider audit.',filesScanned:inventory.length,findings,identifierMentions:mentions,diagnosticOrHistoricalAbsolutePaths:absolutePaths,sourceMaps:maps,approvedBaselineFixtures:known,distIdentity:fs.existsSync('dist/build-identity.json')?JSON.parse(fs.readFileSync('dist/build-identity.json','utf8')):null};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const report=scanSecrets(),out=process.env.ATLAS_EVIDENCE??'docs/evidence/v23/secrets';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.status==='PASS'?0:1;}
