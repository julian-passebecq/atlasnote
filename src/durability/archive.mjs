import {sha256, stable, assertSafeAsset} from '../core/validation.mjs';
import {validateHistory, validateRevision, validateReviewRecords, jsonSafe, HISTORY_LIMITS} from '../history/validation.mjs';
import {unzipBounded, zipFiles} from '../storage/archives.mjs';
import {keys, validateBuildIdentity, validateDescriptor, descriptorIndex, revisionIdentity, sameDescriptor, isHash} from './descriptor.mjs';
const encode = value => new TextEncoder().encode(stable(value));
const decode = bytes => JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
const extension = type => ({'application/pdf':'pdf','image/svg+xml':'svg','image/png':'png','image/jpeg':'jpg','image/webp':'webp','text/plain':'txt'})[type];
const auditIdentity = ({plan,selectedOperationIds,reason,...row}) => structuredClone(row);
function shards(records, prefix, files) {
 const paths=[];let batch=[],size=2,index=0;
 const flush=()=>{if(!batch.length)return;const path=prefix+'/'+String(index++).padStart(5,'0')+'.json';files.set(path,encode(batch));paths.push(path);batch=[];size=2;};
 for(const row of records){const n=encode(row).length;if(size+n>2*1024*1024)flush();batch.push(row);size+=n+1;}flush();return paths;
}
export function requiredRevisionAssets(revisions) {
 const required=new Map();
 const add=(key,sha256,mediaType,bytes)=>{const previous=required.get(key),next={key,sha256,mediaType,...(bytes!==undefined?{bytes}:{})};if(previous&&(previous.sha256!==sha256||previous.mediaType!==mediaType||previous.bytes!==undefined&&bytes!==undefined&&previous.bytes!==bytes))throw Error('Historical asset key has conflicting byte identity: '+key);required.set(key,{...previous,...next});};
 for(const r of revisions){for(const ref of Object.values(r.snapshot.assetRefs??{}))add(ref.key,ref.sha256,ref.mediaType);const d=r.snapshot.document;if(d?.assetKey)add(d.assetKey,d.sha256,'application/pdf',d.bytes);}
 return required;
}
export async function resolveHistoryAssets(revisions, assets, resolveAsset) {
 const all=new Map(assets.map(a=>[a.key,a]));
 for(const [key,ref] of requiredRevisionAssets(revisions)){
  const a=all.get(key)??await resolveAsset?.(key);if(!a||!(a.bytes instanceof Uint8Array)||a.sha256!==ref.sha256||a.mediaType!==ref.mediaType||ref.bytes!==undefined&&a.bytes.length!==ref.bytes||await sha256(a.bytes)!==a.sha256)throw Error('Missing/corrupt historical asset: '+key);
  const ext=extension(a.mediaType);if(!ext)throw Error('Unsupported historical asset media type: '+a.mediaType);assertSafeAsset('asset.'+ext,a.bytes,a.mediaType);all.set(key,a);
 }
 return [...all.values()];
}
function manifestRoot(manifest) {
 const {rootHash,...descriptor}=manifest.descriptor;
 return sha256(stable({...manifest,descriptor}));
}
export async function makeHistoryArchive(workspace, provenance, resolveAsset, options={}) {
 const ws=structuredClone(workspace),h=ws.history;
 if(!h?.meta.initialized)throw Error('Initialize history before preparing an archive.');
 validateBuildIdentity(provenance);await validateHistory(h);
 const retain=options.retain??2;
 if(!Number.isSafeInteger(retain)||retain<1||retain>HISTORY_LIMITS.perResource)throw Error('Retain at least one live revision per resource.');
 const requested=options.resourceKeys??h.heads.map(head=>head.resourceKey);
 if(!Array.isArray(requested)||!requested.length||new Set(requested).size!==requested.length||requested.some(key=>!h.heads.some(head=>head.resourceKey===key)))throw Error('Choose existing, unique resources to archive.');
 const ancestors=structuredClone(h.archives??[]),index=descriptorIndex(ancestors),ranges=[],selected=[];
 for(const key of [...requested].sort()){
  const chain=h.revisions.filter(r=>r.resourceKey===key).sort((a,b)=>a.number-b.number),prefix=chain.slice(0,Math.max(0,chain.length-retain));
  if(!prefix.length)continue;
  const prior=index.groups.get(key)?.at(-1),owner=prior?index.revisions.get(prior.revisionId).archiveId:null;
  ranges.push({resourceKey:key,previous:prior?{archiveId:owner,rootHash:index.archives.get(owner).rootHash,lastRevisionId:prior.revisionId,lastNumber:prior.number}:null,revisions:prefix.map(revisionIdentity)});
  selected.push(...prefix);
 }
 const ids=new Set(selected.map(r=>r.revisionId));
 // Pending proposals/drafts never leave the live store. A review spanning a live
 // revision remains live too; closed audit-only decisions are independently recoverable.
 const reviews=options.includeClosedReviews===false?[]:h.reviews.filter(row=>row.status!=='staged'&&Number.isSafeInteger(row.decidedAt)&&(row.revisionIds??[]).every(id=>ids.has(id)));
 if(!selected.length&&!reviews.length)throw Error('No eligible older revisions or closed reviews. Current heads are never archived.');
 const available=await resolveHistoryAssets(selected,ws.assets,resolveAsset),assets=[],files=new Map(),needed=requiredRevisionAssets(selected);
 for(const key of [...needed.keys()].sort()){
  const a=available.find(a=>a.key===key),path='assets/'+String(assets.length).padStart(5,'0')+'.'+extension(a.mediaType);
  files.set(path,new Uint8Array(a.bytes));assets.push({key,sha256:a.sha256,mediaType:a.mediaType,bytes:a.bytes.length,path});
 }
 const revisionShards=shards(selected,'revisions',files),reviewShards=shards(reviews,'reviews',files),fileHashes={};
 for(const [path,bytes] of files)fileHashes[path]=await sha256(bytes);
 const descriptor={kind:'archive',schemaVersion:1,archiveSchema:1,archiveId:'archive.'+crypto.randomUUID(),rootHash:'0'.repeat(64),createdAt:Date.now(),provenance:structuredClone(provenance),sourceEpoch:h.meta.epoch,sourceHistoryHash:await sha256(stable(h)),ranges,assets,reviews:reviews.map(auditIdentity),counts:{revisions:selected.length,reviews:reviews.length,assets:assets.length,assetBytes:assets.reduce((n,a)=>n+a.bytes,0),structuredBytes:encode(selected).length+encode(reviews).length}};
 const manifest={format:'atlas-history-archive',archiveSchema:1,descriptor,ancestors,revisionShards,reviewShards,fileHashes};
 descriptor.rootHash=await manifestRoot(manifest);validateDescriptor(descriptor);
 files.set('archive.json',encode(manifest));const bytes=await zipFiles(files,'history-archive');
 // Serialization is part of the trust boundary, not just the in-memory data.
 return verifyHistoryArchive(bytes);
}
export async function verifyHistoryArchive(input, expected) {
 const bytes=input instanceof Uint8Array?new Uint8Array(input):new Uint8Array(await input.arrayBuffer());
 const {files,transfer}=await unzipBounded(bytes);
 if(transfer?.kind!=='history-archive'||!files.has('archive.json'))throw Error('Not an AtlasNote history archive.');
 const manifest=decode(files.get('archive.json'));jsonSafe(manifest,HISTORY_LIMITS.bytes);
 keys(manifest,['format','archiveSchema','descriptor','ancestors','revisionShards','reviewShards','fileHashes'],'archive manifest');
 if(manifest.format!=='atlas-history-archive'||manifest.archiveSchema!==1)throw Error('Unknown archive format/schema.');
 const d=validateDescriptor(manifest.descriptor);const graph=descriptorIndex([...manifest.ancestors,d]);
 if(await manifestRoot(manifest)!==d.rootHash)throw Error('Archive root hash mismatch.');
 keys(manifest.fileHashes,Object.keys(manifest.fileHashes),'archive file hashes');
 const payload=[...files.keys()].filter(path=>path!=='archive.json'&&path!=='atlas-transfer.json');
 if(payload.length!==Object.keys(manifest.fileHashes).length||payload.some(path=>!Object.hasOwn(manifest.fileHashes,path)))throw Error('Unlisted archive payload.');
 for(const [path,hash] of Object.entries(manifest.fileHashes))if(!isHash(hash)||!files.has(path)||await sha256(files.get(path))!==hash)throw Error('Archive file SHA-256 mismatch: '+path);
 const readShards=(paths,prefix)=>{if(!Array.isArray(paths)||paths.length>1000||new Set(paths).size!==paths.length||paths.some(p=>typeof p!=='string'||!new RegExp('^'+prefix+'/\\d{5}\\.json$').test(p)||!files.has(p)))throw Error('Missing/invalid archive shards');return paths.flatMap(path=>{const rows=decode(files.get(path));if(!Array.isArray(rows))throw Error('Invalid archive shard');return rows;});};
 const revisions=readShards(manifest.revisionShards,'revisions'),reviews=readShards(manifest.reviewShards,'reviews');
 if(revisions.length!==d.counts.revisions||reviews.length!==d.counts.reviews||encode(revisions).length+encode(reviews).length!==d.counts.structuredBytes)throw Error('Archive structured counts/bytes mismatch.');
 const identities=new Map(d.ranges.flatMap(range=>range.revisions.map(r=>[r.revisionId,r]))),seen=new Set();
 for(const r of revisions){validateRevision(r);if(seen.has(r.revisionId)||stable(revisionIdentity(r))!==stable(identities.get(r.revisionId))||await sha256(stable(r.snapshot))!==r.contentHash)throw Error('Archive revision identity/content hash mismatch.');seen.add(r.revisionId);for(const key of ['restoredFromRevisionId','derivedFromRevisionId'])if(r[key]){const source=graph.revisions.get(r[key]);if(!source||source.resourceKey!==r.resourceKey||source.number>=r.number)throw Error('Archive restore/derived provenance mismatch.');}}
 validateReviewRecords(reviews,new Map(revisions.map(r=>[r.revisionId,r])));
 if(reviews.some(r=>r.status==='staged')||stable(reviews.map(auditIdentity))!==stable(d.reviews))throw Error('Archive cannot contain pending or mismatched audit rows.');
 const assets=d.assets.map(meta=>{const value=files.get(meta.path);if(!value||value.length!==meta.bytes)throw Error('Missing/wrong-sized archive asset.');assertSafeAsset(meta.path,value,meta.mediaType);return {key:meta.key,sha256:meta.sha256,mediaType:meta.mediaType,bytes:new Uint8Array(value)};});
 await resolveHistoryAssets(revisions,assets);
 for(const a of assets)if(await sha256(a.bytes)!==a.sha256)throw Error('Archive asset SHA-256 mismatch.');
 const exactFiles=[...manifest.revisionShards,...manifest.reviewShards,...d.assets.map(a=>a.path)];if(new Set(exactFiles).size!==exactFiles.length||exactFiles.length!==payload.length||payload.some(path=>!exactFiles.includes(path)))throw Error('Unexpected archive payload entry.');
 const fileHash=await sha256(bytes);
 if(expected&&(expected.descriptor.archiveId!==d.archiveId||expected.descriptor.rootHash!==d.rootHash||expected.fileHash!==fileHash||!sameDescriptor(expected.descriptor,d)))throw Error('Select the exact saved archive that was prepared. No compaction was authorized.');
 return {descriptor:structuredClone(d),ancestors:structuredClone(manifest.ancestors),revisions,reviews,assets,bytes,fileHash};
}
export function assertArchiveAttachment(history, archive) {
 const expected=history?.archives?.find(a=>a.archiveId===archive.descriptor.archiveId);
 if(!expected||!sameDescriptor(expected,archive.descriptor))throw Error('This is not the exact archive required by this workspace.');
 for(const ancestor of archive.ancestors??[])if(!history.archives.some(a=>sameDescriptor(a,ancestor)))throw Error('Archive ancestor descriptor does not match this workspace.');
 return expected;
}
/** Conservative ownership: inspect every current/imported/personal domain and
 * retain shared SHA-addressed bytes. Unknown/unrelated orphan assets are not GC. */
export function liveAssetReachability(ws, retainedRevisions, builtPacks=[], currentResources=[]) {
 const assetIndex=new Map(ws.assets.map(a=>[a.key,a])),allHashes=new Set(ws.assets.map(a=>a.sha256)),keys=new Set(),hashes=new Set();
 const mark=key=>{if(typeof key!=='string')return;keys.add(key);const a=assetIndex.get(key);if(a)hashes.add(a.sha256);};
 const scan=value=>{if(typeof value==='string'){if(assetIndex.has(value))mark(value);if(allHashes.has(value))hashes.add(value);}else if(value&&typeof value==='object')for(const v of Object.values(value))scan(v);};
 for(const pack of [...builtPacks,...ws.imports]){for(const key of pack.assetKeys??[])mark(key);for(const d of pack.documents??[])if(d.assetKey)mark(d.assetKey);}
 scan(ws.overlays);scan(ws.personal);
 for(const r of [...retainedRevisions,...currentResources]){for(const ref of Object.values(r.snapshot.assetRefs??{})){mark(ref.key);hashes.add(ref.sha256);}const d=r.snapshot.document;if(d?.assetKey){mark(d.assetKey);hashes.add(d.sha256);}}
 return {keys,hashes};
}
export async function planCompaction(workspace, archive, builtPacks=[], currentResources=[], resolveAsset) {
 const ws=structuredClone(workspace),h=ws.history,d=archive.descriptor;
 if(!h||h.meta.epoch!==d.sourceEpoch||await sha256(stable(h))!==d.sourceHistoryHash)throw Error('History changed after archive preparation. Prepare and save a new archive.');
 await validateHistory(h);
 if(h.archives?.some(a=>a.archiveId===d.archiveId))throw Error('Archive was already compacted.');
 const removeIds=new Set(archive.revisions.map(r=>r.revisionId)),liveById=new Map(h.revisions.map(r=>[r.revisionId,r])),reviewsById=new Map(h.reviews.map(r=>[r.id,r]));
 for(const range of d.ranges){const chain=h.revisions.filter(r=>r.resourceKey===range.resourceKey).sort((a,b)=>a.number-b.number),prefix=chain.slice(0,range.revisions.length);if(prefix.length>=chain.length||stable(prefix)!==stable(archive.revisions.filter(r=>r.resourceKey===range.resourceKey))||prefix.some(r=>r.revisionId===h.heads.find(head=>head.resourceKey===range.resourceKey)?.revisionId))throw Error('Only an exact oldest prefix before the current head can be compacted.');}
 for(const revision of archive.revisions)if(stable(liveById.get(revision.revisionId))!==stable(revision))throw Error('Archive revision no longer matches live history.');
 const reviewIds=new Set(archive.reviews.map(r=>r.id));for(const review of archive.reviews){if(review.status==='staged'||stable(reviewsById.get(review.id))!==stable(review)||(review.revisionIds??[]).some(id=>!removeIds.has(id)))throw Error('Pending or changed audit cannot be compacted.');}
 const retained=h.revisions.filter(r=>!removeIds.has(r.revisionId)),reach=liveAssetReachability(ws,retained,builtPacks,currentResources);
 const previousOwners=new Set((h.archives??[]).flatMap(a=>a.assets.map(asset=>asset.key)));
 const removedAssets=[];
 for(const source of archive.assets){const a=ws.assets.find(a=>a.key===source.key);if(!a||reach.keys.has(a.key)||reach.hashes.has(a.sha256)||previousOwners.has(a.key))continue;if(a.mediaType!==source.mediaType||a.sha256!==source.sha256||a.bytes.length!==source.bytes.length||await sha256(a.bytes)!==source.sha256)throw Error('Live/archive asset identity changed.');removedAssets.push(a.key);}
 const nextHistory={...h,meta:{...h.meta,epoch:h.meta.epoch+1},revisions:retained,reviews:h.reviews.filter(r=>!reviewIds.has(r.id)),archives:[...(h.archives??[]),structuredClone(d)]};
 const nextAssets=ws.assets.filter(a=>!removedAssets.includes(a.key));
 const proof=await resolveHistoryAssets(retained,nextAssets,resolveAsset);await validateHistory(nextHistory,proof,true);
 const preview={archiveId:d.archiveId,rootHash:d.rootHash,revisionIds:[...removeIds],reviewIds:[...reviewIds],assetKeys:removedAssets,assetBytes:ws.assets.filter(a=>removedAssets.includes(a.key)).reduce((n,a)=>n+a.bytes.length,0),structuredBytesBefore:encode(h).length,structuredBytesAfter:encode(nextHistory).length};
 return {workspace:{...ws,history:nextHistory,assets:nextAssets},preview,previewHash:await sha256(stable(preview))};
}
