import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function writeBuildIdentity(output,buildKind) {
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
 const sourceCommit=git('rev-parse','HEAD');
 if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('An exact source commit is required for artifact provenance.');
 const sourceDirty=!!git('status','--porcelain');
 const names=[...new Set(execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean))].sort();
 const digest=createHash('sha256');
 for(const name of names){let bytes;try{bytes=await fs.readFile(name);}catch{bytes=Buffer.from('[deleted]');}digest.update(name+'\0'+bytes.length+'\0');digest.update(bytes);}
 const app=JSON.parse(await fs.readFile('package.json','utf8')),pdf=JSON.parse(await fs.readFile('config/vendor/pdfatlas.source-provenance.json','utf8'));
 const identity={appVersion:app.version,sourceCommit,sourceHash:digest.digest('hex'),sourceDirty,databaseVersion:3,pdfAtlasCommit:pdf.commit,buildKind};
 await fs.writeFile(path.join(output,'build-identity.json'),JSON.stringify(identity,null,2)+'\n');return identity;
}
