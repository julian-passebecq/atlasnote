/** Never relabel an inherited/compatibility artifact as the current candidate. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {pathToFileURL} from 'node:url';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
export function sourceIdentity(){return {sourceCommit:git('rev-parse','HEAD'),sourceTree:git('rev-parse','HEAD^{tree}'),sourceDirty:Boolean(git('status','--porcelain','--untracked-files=all'))};}
export function sourceHash(){const names=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))].sort();const hash=createHash('sha256');for(const name of names){const b=fs.readFileSync(name);hash.update(name+'\0'+b.length+'\0');hash.update(b);}return hash.digest('hex');}
export function compareBuildIdentity(build,source,hash){const reasons=[];
 if(build.buildKind!=='integrated')reasons.push('Integrated build required');
 if(build.sourceCommit!==source.sourceCommit)reasons.push('Build source commit differs from current candidate');
 if(build.sourceHash!==hash)reasons.push('Build source fingerprint differs from current candidate');
 if(build.sourceDirty||source.sourceDirty)reasons.push('Clean build and checkout required');
 if(build.appVersion!=='2.3.0'||build.databaseVersion!==3)reasons.push('Unexpected app/database version');
 if(build.pdfAtlasCommit!=='fa5e83f7825cdc837078f87c5e130cb012332195')reasons.push('PDFAtlas provenance differs');
 return reasons;}
export function checkCandidateBuild(){const source=sourceIdentity(),hash=sourceHash();let build;try{build=JSON.parse(fs.readFileSync('dist/build-identity.json','utf8'));}catch(e){return {...source,status:'BLOCKED',reasons:['Integrated build identity unavailable: '+e.code]};}const reasons=compareBuildIdentity(build,source,hash);return {...source,sourceHash:hash,buildIdentity:build,status:reasons.length?'BLOCKED':'PASS',reasons};}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){const result=checkCandidateBuild(),out=process.env.ATLAS_EVIDENCE??'docs/evidence/v23/build-identity';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PASS'?0:2;}
