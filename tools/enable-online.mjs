import {spawnSync} from 'node:child_process';
console.log('Installs the optional Vite + React-PDF build and writes exact resolved versions to package-lock.json. It does not publish or upload content.');
const args=['install','--save-exact','react@18.3.1','react-dom@18.3.1','react-pdf@10','vite@latest','@types/react@18','@types/react-dom@18'];
const result=spawnSync(process.platform==='win32'?'npm.cmd':'npm',args,{stdio:'inherit',shell:process.platform==='win32'});if(result.status!==0)process.exit(result.status??1);
console.log('Next: npm run build:vite. Commit the updated package.json AND package-lock.json after validating the PDF test matrix. Do not separately force-install a newer pdfjs-dist.');
