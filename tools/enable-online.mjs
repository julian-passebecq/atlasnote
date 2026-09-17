/** One-time, explicit lockfile authoring command. CI/deploy NEVER resolves versions.
 * A successful run saves exact installed versions, then verifies the wrapper pair.
 * This is not called by npm ci/build; a blocked install must remain a release blocker. */
import {spawnSync} from 'node:child_process';
const npm=process.platform==='win32'?'npm.cmd':'npm';
const runtime=['react@18.3.1','react-dom@18.3.1','react-pdf@10.5.0'];
// Vite 8.2.2 is the registry-published target at this pass. Compatibility is proved
// by check:integrated-deps + typecheck/build/runtime, not this version declaration.
const development=['vite@8.2.2','@types/react@18','@types/react-dom@18','typescript@5.8.3'];
console.log('Authoring the integrated dependency lock. No upload, publication or deployment.');
for(const args of [['install','--save-exact',...runtime],['install','--save-dev','--save-exact',...development]]){
 const r=spawnSync(npm,[...args,'--fetch-retries=0','--fetch-timeout=15000'],{stdio:'inherit',shell:process.platform==='win32'});
 if(r.status!==0){console.error('Dependency resolution did not complete. Preserve the workspace; do not call the hosted build certified.');process.exit(r.status??1);}
}
const check=spawnSync(process.execPath,['tools/check-integrated-deps.mjs'],{stdio:'inherit'});if(check.status!==0)process.exit(check.status??1);
console.log('Exact resolved dependency versions saved. Review package.json AND package-lock.json, run clean npm ci, npm audit, all typechecks and production browser gates before release. Never separately force-install a newer pdfjs-dist.');
