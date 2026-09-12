/** Offline dependency inventory and vendored-byte integrity, not vulnerability certification. */
import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
const lock=JSON.parse(await fs.readFile('package-lock.json','utf8')),packages=[];
for(const [folder,entry]of Object.entries(lock.packages)){if(!folder)continue;let installed;try{installed=JSON.parse(await fs.readFile(folder+'/package.json','utf8'));}catch{}
 packages.push({path:folder,name:installed?.name??folder.split('node_modules/').at(-1),version:entry.version,installedVersion:installed?.version??null,license:installed?.license??entry.license??'UNRESOLVED',integrity:entry.integrity??null});}
const baseline=JSON.parse(await fs.readFile('docs/vendor-sha256.json','utf8')),vendor=[];
for(const [path,expected]of Object.entries(baseline.sha256)){const actual=createHash('sha256').update(await fs.readFile('src/vendor/'+path)).digest('hex');vendor.push({path,expected,actual,status:actual===expected?'PASS':'FAIL'});}
const report={scope:'Local installed lockfile packages and unchanged vendor bytes. Does NOT certify current vulnerabilities or complete precompiled Mermaid transitive licenses.',
 lockfilePackages:packages,vendorFiles:vendor.length,vendorByteIntegrity:vendor.every(v=>v.status==='PASS')?'PASS':'FAIL',
 installedVersionsMatch:packages.every(p=>p.version===p.installedVersion),
 fullDependencyLicenseAudit:{status:'BLOCKED',reason:'Registry vulnerability review was not executed in the offline release environment; the inherited precompiled Mermaid closure has no complete original dependency lock/SBOM. Original upstream notices and byte pins remain intact.'},vendor};
await fs.mkdir('docs/evidence/hardening',{recursive:true});await fs.writeFile('docs/evidence/hardening/dependency-inventory.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,vendor:undefined,lockfilePackages:packages.map(p=>({name:p.name,version:p.version,license:p.license}))},null,2));
if(report.vendorByteIntegrity!=='PASS'||!report.installedVersionsMatch)process.exit(1);
