/** Offline release check against an exact, independently fetched source blob.
 * Updating the pin requires an explicit maintainer review, never runtime fetch. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {stable} from '../src/core/validation.mjs';
const fields=['id','relativePath','sha256','bytes','pageCount','rights'];
export function checkCriticalManifest(source,enriched){
 for(const k of ['format','schemaVersion','id','version'])if(source[k]!==enriched[k])throw Error('PDF Atlas source/enrichment drift: '+k);
 const entries=new Map(source.entries.map(e=>[e.id,e]));if(entries.size!==source.entries.length||enriched.entries.length!==entries.size||new Set(enriched.entries.map(e=>e.id)).size!==entries.size)throw Error('PDF Atlas duplicate/missing logical IDs');
 for(const e of enriched.entries){const original=entries.get(e.id);if(!original)throw Error('Unreviewed PDF logical ID: '+e.id);for(const key of fields)if(stable(e[key])!==stable(original[key]))throw Error('PDF Atlas critical drift: '+e.id+'.'+key);}
 return true;
}
export async function checkPdfatlasProvenance({generated=true}={}){
 const read=async name=>JSON.parse(await fs.readFile(name,'utf8'));
 const [config,provenance,enriched,raw]=await Promise.all([read('config/pdfatlas.json'),read('config/vendor/pdfatlas.source-provenance.json'),read('config/pdfatlas.library.json'),fs.readFile('config/vendor/pdfatlas.library.source.json')]);
 const match=config.baseUrl.match(/^https:\/\/raw\.githubusercontent\.com\/julian-passebecq\/pdfatlas\/([a-f0-9]{40})\/$/);if(!match)throw Error('Production PDF Atlas must use a full 40-character commit, never /main/');
 if(provenance.schemaVersion!==1||provenance.repository!=='julian-passebecq/pdfatlas'||provenance.path!=='library.json'||provenance.commit!==match[1])throw Error('PDF Atlas vendored source and production pin differ');
 const digest=createHash('sha256').update(raw).digest('hex'),blob=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+raw.length+'\0'),raw])).digest('hex');
 if(digest!==provenance.sha256||blob!==provenance.gitBlobSha)throw Error('Vendored PDF Atlas source bytes differ from reviewed Git blob');
 const source=JSON.parse(raw);checkCriticalManifest(source,enriched);
 if(generated){const index=await read('content/packs/pdfatlas.public/atlas-documents.json'),pack=await read('content/packs/pdfatlas.public/atlas-pack.json');if(index.version!==source.version||index.documents.length!==source.entries.length||pack.assets.length)throw Error('Generated PDF Atlas pack drift/binary asset');for(const d of index.documents){const e=source.entries.find(e=>e.id===d.id);if(!e||d.source.url!==config.baseUrl+e.relativePath||d.sha256!==e.sha256||d.bytes!==e.bytes||d.pageCount!==e.pageCount||d.rights.status!==e.rights.status||d.rights.attribution!==e.rights.attribution)throw Error('Generated PDF Atlas source drift: '+d.id);}const paths=await fs.readdir('content/packs/pdfatlas.public',{recursive:true});if(paths.some(p=>p.toLowerCase().endsWith('.pdf')))throw Error('External public PDF bytes must not be bundled');}
 return {status:'PASS',commit:match[1],sourceGitBlob:blob,sourceSha256:digest,criticalFields:fields,logicalDocuments:source.entries.length,bundledExternalPdfBytes:0};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)console.log(JSON.stringify(await checkPdfatlasProvenance(),null,2));
