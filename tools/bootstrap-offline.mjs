/** Restore the existing vendored runtime bundles for Node tests, without registry access.
 * TypeScript is not vendored: an already installed, matching 5.8.3 compiler is required.
 * This is a documented offline route, not a substitute npm-ci/lockfile attestation.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const globalRoot=execFileSync(process.platform==='win32'?'npm.cmd':'npm',['root','-g'],{encoding:'utf8'}).trim();
for(const [name,version,file] of [['jszip','3.10.1','jszip.js'],['prismjs','1.30.0','prism.js']]) {
 const target=path.resolve('node_modules',name);
 await fs.mkdir(target,{recursive:true});
 await fs.copyFile('src/vendor/'+file,path.join(target,'index.cjs'));
 await fs.writeFile(path.join(target,'package.json'),JSON.stringify({name,version,main:'index.cjs',atlasOfflineVendoredBundle:true},null,2)+'\n');
 const bytes=await fs.readFile(path.join(target,'index.cjs'));
 console.log(`${name}@${version}: restored from checked-in bundle; sha256=${createHash('sha256').update(bytes).digest('hex')}`);
}
let local;
try {local=JSON.parse(await fs.readFile('node_modules/typescript/package.json','utf8'));}catch{}
if(local?.version!=='5.8.3') {
 const source=path.join(globalRoot,'typescript');
 const meta=JSON.parse(await fs.readFile(path.join(source,'package.json'),'utf8'));
 if(meta.version!=='5.8.3')throw Error('Offline build needs installed TypeScript 5.8.3; found '+meta.version);
 await fs.rm('node_modules/typescript',{recursive:true,force:true});
 await fs.cp(source,'node_modules/typescript',{recursive:true});
}
await fs.mkdir('node_modules/.bin',{recursive:true});
if(process.platform==='win32') {
 await fs.writeFile('node_modules/.bin/tsc.cmd','@echo off\r\nnode "%~dp0..\\typescript\\bin\\tsc" %*\r\n');
} else {
 await fs.rm('node_modules/.bin/tsc',{force:true});
 await fs.symlink('../typescript/bin/tsc','node_modules/.bin/tsc');
}
console.log('Offline toolchain ready. Optional React-PDF/Vite packages were NOT installed.');
