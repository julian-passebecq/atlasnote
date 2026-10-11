import fs from 'node:fs';
import {acceptsInheritedPrerequisite} from './inherited-prerequisite.mjs';
import {sourceIdentity,sourceHash} from './check-v23-build.mjs';
let proof;try{proof=JSON.parse(fs.readFileSync('docs/evidence/v23/release/results.json','utf8'));}catch{}
const accepted=acceptsInheritedPrerequisite(proof,{...sourceIdentity(),sourceHash:sourceHash()});
console.log(accepted?'PASS: complete fresh same-source V23 prerequisite':'BLOCKED: inherited execution requires complete fresh same-source V23 evidence');
process.exitCode=accepted?0:2;
