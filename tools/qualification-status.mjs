/** Distinguish workflow execution success from release qualification. No provider calls. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
export function qualificationStatus(portable,full){
 const status=portable==='success'&&full==='success'?'PASS':[portable,full].includes('failure')?'FAIL':'BLOCKED';
 return {status,portableCore:portable,fullV23:full,releaseQualified:status==='PASS',reason:status==='PASS'?'Complete V23 jobs succeeded; same-source evidence remains required by the inherited runner.':'Portable success, skipped, cancelled or missing jobs do not qualify a release.'};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const report=qualificationStatus(process.env.ATLAS_PORTABLE_RESULT??'missing',process.env.ATLAS_FULL_RESULT??'missing');
 fs.mkdirSync('docs/evidence/ci',{recursive:true});fs.writeFileSync('docs/evidence/ci/qualification-status.json',JSON.stringify(report,null,2)+'\n');
 if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'qualification_status='+report.status+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`V23 release qualification: **${report.status}**\n\nPortable core: ${report.portableCore}. Full V23: ${report.fullV23}. ${report.reason}\n`);
 console.log(JSON.stringify(report,null,2));
 if(process.env.ATLAS_RELEASE_REQUESTED==='true'&&report.status!=='PASS')process.exitCode=2;
}
