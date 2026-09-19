import {unzipBounded,zipFiles,makeBackup,readBackup} from '../storage/archives.mjs';
import {sha256,stable} from '../core/validation.mjs';
import {assertProjection} from '../history/engine.js';
import {captureResources} from '../history/adapters.js';
import {compose} from '../core/workspace.js';
import {validateHistory} from '../history/validation.mjs';
import {keys,isHash,validateBuildIdentity} from './descriptor.mjs';
import {verifyHistoryArchive,assertArchiveAttachment} from './archive.mjs';
import {randomUuid} from './uuid.mjs';
import type {Workspace,Asset} from '../core/model.js';
import type {BuildIdentity,VerifiedArchive} from './model.js';
const decode=(bytes:Uint8Array)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
const bytesOf=async(input:File|Uint8Array)=>input instanceof Uint8Array?new Uint8Array(input):new Uint8Array(await input.arrayBuffer());
export async function summarizeBackup(backup:any,fileHash:string){const ws:Workspace=backup.workspace;return {schema:backup.schemaVersion,artifactId:backup.artifactId??null,createdAt:backup.createdAt??null,provenance:backup.provenance??null,rootHash:backup.rootHash??null,fileHash,historyHash:ws.history?await sha256(stable(ws.history)):null,resources:ws.history?.heads.length??0,liveRevisions:ws.history?.revisions.length??0,liveReviews:ws.history?.reviews.length??0,assets:ws.assets.length,assetBytes:ws.assets.reduce((n,a)=>n+a.bytes.length,0),archiveDependencies:backup.archiveDependencies??[],externalDependencies:backup.externalDependencies??[]};}
/** One read-only validator used by both Verify File and Restore Preview. */
export async function verifyBackupFile(input:File|Uint8Array,built:any,schemas:any){const bytes=await bytesOf(input),{files,transfer}=await unzipBounded(bytes);if(transfer&&transfer.kind!=='backup')throw Error('This file is not a workspace backup.');const backup=await readBackup(files,schemas);if(backup.workspace.history)await assertProjection(compose(built,backup.workspace),backup.workspace);const summary=await summarizeBackup(backup,await sha256(bytes));return {backup,summary,bytes};}
export async function createVerifiedBackup(ws:Workspace,built:any,resolver:(key:string)=>Promise<Asset|undefined>,provenance:BuildIdentity,schemas:any){const generated=await makeBackup(ws,built,resolver,provenance);const verified=await verifyBackupFile(generated.bytes,built,schemas);return {...generated,...verified};}
/** Integrity checking works on a detached snapshot. No writes, repair or pruning. */
export async function checkWorkspaceIntegrity(workspace:Workspace,built:any,resolver:(key:string)=>Promise<Asset|undefined>,schemas:any,provenance:BuildIdentity){
 const ws=structuredClone(workspace);if(ws.history)await validateHistory(ws.history);
 const result=await createVerifiedBackup(ws,built,resolver,provenance,schemas);
 return {status:'PASS',checkedAt:Date.now(),...result.summary,currentProjectionHash:await sha256(stable(captureResources(compose(built,ws),ws))),scope:'Current content, live history, descriptor graph, imports and all included local assets. Archive payloads require separate attachment verification.'};
}
export async function createRecoveryBundle(workspace:Workspace,built:any,resolver:(key:string)=>Promise<Asset|undefined>,provenance:BuildIdentity,schemas:any,archivePayload:(id:string)=>Uint8Array|undefined){
 const ws=structuredClone(workspace),verified=await createVerifiedBackup(ws,built,resolver,provenance,schemas),files=new Map<string,Uint8Array>(),archives:any[]=[];
 const copy=async(bytes:Uint8Array,prefix:string)=>{const {files:entries}=await unzipBounded(bytes);for(const [name,body]of entries)if(name!=='atlas-transfer.json')files.set(prefix+name,body);};
 await copy(verified.bytes,'workspace/');
 for(const descriptor of ws.history?.archives??[]){const input=archivePayload(descriptor.archiveId);if(!input)throw Error('Attach the required archive before creating complete recovery: '+descriptor.archiveId);const archive=await verifyHistoryArchive(input);assertArchiveAttachment(ws.history,archive);const prefix='archives/'+String(archives.length).padStart(5,'0')+'/';await copy(archive.bytes,prefix);archives.push({archiveId:descriptor.archiveId,rootHash:descriptor.rootHash,prefix});}
 const hashes:Record<string,string>={};for(const [name,bytes]of files)hashes[name]=await sha256(bytes);
 const unsigned={format:'atlas-complete-recovery',recoverySchema:1,artifactId:'recovery.'+randomUuid(),createdAt:Date.now(),provenance:structuredClone(provenance),workspace:{prefix:'workspace/',rootHash:verified.backup.rootHash,schema:verified.backup.schemaVersion},archives,files:hashes};
 files.set('recovery.json',new TextEncoder().encode(stable({...unsigned,rootHash:await sha256(stable(unsigned))})));
 const bytes=await zipFiles(files,'complete-recovery');return {...await verifyRecoveryBundle(bytes,built,schemas),bytes};
}
export async function verifyRecoveryBundle(input:File|Uint8Array,built:any,schemas:any){
 const bytes=await bytesOf(input),{files,transfer}=await unzipBounded(bytes);if(transfer?.kind!=='complete-recovery'||!files.has('recovery.json'))throw Error('Not a complete recovery bundle.');
 const m=decode(files.get('recovery.json')!);keys(m,['format','recoverySchema','artifactId','createdAt','provenance','workspace','archives','files','rootHash'],'recovery manifest');validateBuildIdentity(m.provenance);
 if(m.format!=='atlas-complete-recovery'||m.recoverySchema!==1||typeof m.artifactId!=='string'||!/^recovery\.[a-z0-9-]{36}$/.test(m.artifactId)||!Number.isSafeInteger(m.createdAt)||m.createdAt<0||!Array.isArray(m.archives)||!isHash(m.rootHash))throw Error('Invalid recovery manifest.');
 const {rootHash,...unsigned}=m;if(await sha256(stable(unsigned))!==rootHash)throw Error('Recovery root hash mismatch.');
 keys(m.files,Object.keys(m.files),'recovery hashes');keys(m.workspace,['prefix','rootHash','schema'],'recovery workspace');if(m.workspace.prefix!=='workspace/'||m.workspace.schema!==5||!isHash(m.workspace.rootHash))throw Error('Invalid recovery workspace binding.');
 const payload=[...files.keys()].filter(p=>p!=='recovery.json'&&p!=='atlas-transfer.json');if(payload.length!==Object.keys(m.files).length||payload.some(p=>!Object.hasOwn(m.files,p)))throw Error('Unlisted recovery payload.');
 for(const [path,hash]of Object.entries(m.files))if(!isHash(hash)||!files.has(path)||await sha256(files.get(path))!==hash)throw Error('Recovery payload hash mismatch.');
 const subtree=(prefix:string)=>new Map([...files].filter(([name])=>name.startsWith(prefix)).map(([name,body])=>[name.slice(prefix.length),body]));
 const current=await verifyBackupFile(await zipFiles(subtree('workspace/'),'backup'),built,schemas);if(current.backup.rootHash!==m.workspace.rootHash)throw Error('Recovery workspace root mismatch.');
 const dependencies=current.backup.workspace.history?.archives??[],archives:VerifiedArchive[]=[],seen=new Set();
 if(m.archives.length!==dependencies.length)throw Error('Incomplete archive set in recovery bundle.');
 for(let i=0;i<m.archives.length;i++){const a=m.archives[i];keys(a,['archiveId','rootHash','prefix'],'recovery archive binding');if(seen.has(a.archiveId)||a.prefix!=='archives/'+String(i).padStart(5,'0')+'/')throw Error('Ambiguous recovery archive ownership.');seen.add(a.archiveId);const archive=await verifyHistoryArchive(await zipFiles(subtree(a.prefix),'history-archive'));if(archive.descriptor.archiveId!==a.archiveId||archive.descriptor.rootHash!==a.rootHash)throw Error('Recovery archive root mismatch.');assertArchiveAttachment(current.backup.workspace.history,archive);archives.push(archive as VerifiedArchive);}
 if(payload.some(name=>!name.startsWith('workspace/')&&!m.archives.some(a=>name.startsWith(a.prefix))))throw Error('Unowned recovery payload.');
 return {manifest:m,backup:current.backup,archives,summary:{...current.summary,artifactId:m.artifactId,createdAt:m.createdAt,rootHash:m.rootHash,fileHash:await sha256(bytes),recoverySchema:1,completeArchiveCount:archives.length,archiveAssetBytes:archives.reduce((n,a)=>n+a.descriptor.counts.assetBytes,0)},bytes};
}
