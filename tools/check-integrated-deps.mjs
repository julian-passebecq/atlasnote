import fs from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
export async function packageRoot(entry,name){let dir=path.dirname(entry);while(dir!==path.dirname(dir)){try{const p=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));if(p.name===name)return {dir,p};}catch{}dir=path.dirname(dir);}throw Error('Unable to locate '+name+' package metadata');}
export async function checkIntegratedDependencies(){
 const manifest=JSON.parse(await fs.readFile('package.json','utf8')),lock=JSON.parse(await fs.readFile('package-lock.json','utf8'));
 const packages={};
 for(const name of ['react','react-dom','react-pdf','vite','@types/react','@types/react-dom','typescript']){
  const declared=manifest.dependencies?.[name]??manifest.devDependencies?.[name];
  if(!declared||!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(declared))throw Error('Integrated dependency '+name+' must be installed and pinned exactly. Run npm run enable:online once on a registry-enabled runtime, review both manifests, then clean npm ci.');
  const entry=require.resolve(name.startsWith('@types/')?name+'/package.json':name);
  const actual=await packageRoot(entry,name);if(actual.p.version!==declared)throw Error(name+' installed version differs from exact package.json pin');
  if(lock.packages?.['node_modules/'+name]?.version!==declared)throw Error(name+' is not pinned identically in package-lock.json');
  packages[name]=actual;
 }
 for(const name of ['react','react-dom'])if(packages[name].p.version!=='18.3.1')throw Error('React and ReactDOM must both be 18.3.1');
 for(const name of ['@types/react','@types/react-dom'])if(!packages[name].p.version.startsWith('18.'))throw Error(name+' must match React 18');
 const wrapper=packages['react-pdf'],fromWrapper=createRequire(path.join(wrapper.dir,'package.json'));
 const pdfjs=await packageRoot(fromWrapper.resolve('pdfjs-dist'),'pdfjs-dist');
 if(wrapper.p.version!=='10.5.0'||pdfjs.p.version!=='5.4.296')throw Error('Unsupported PDF engine pairing: require react-pdf 10.5.0 and its pdfjs-dist 5.4.296, got '+wrapper.p.version+' / '+pdfjs.p.version);
 return {...packages,pdfjs};
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname){const packages=await checkIntegratedDependencies();console.log(JSON.stringify({status:'PASS',versions:Object.fromEntries(Object.entries(packages).map(([name,x])=>[name,x.p.version]))},null,2));}
