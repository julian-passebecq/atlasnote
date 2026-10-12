/** Explicit release entry point; no arbitrary Wrangler flags or target overrides. */
import assert from 'node:assert/strict';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {runReleaseGuard,TARGET_CONFIGS} from './cloudflare-release-guard.mjs';
export function releaseArguments(target,mode){
 assert(target==='qa'||target==='production','Choose qa or production explicitly');
 assert(mode==='dry-run'||mode==='release','Choose dry-run or release explicitly');
 return [...(mode==='dry-run'?['deploy','--dry-run']:target==='qa'?['versions','upload']:['deploy']),'--config',TARGET_CONFIGS[target]];
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  assert.equal(process.argv.length,6,'Use --target qa|production --mode dry-run|release; extra flags are forbidden');
  assert.equal(process.argv[2],'--target');assert.equal(process.argv[4],'--mode');
  const target=process.argv[3],args=releaseArguments(target,process.argv[5]);
  console.log(JSON.stringify(runReleaseGuard(target),null,2));
  assert(process.env.npm_execpath,'Use the documented npm script');
  const child=spawnSync(process.execPath,[process.env.npm_execpath,'exec','--no','--','wrangler',...args],{stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
  process.exitCode=child.status===0&&!child.error&&!child.signal?0:2;
 }catch(error){console.error('BLOCKED: '+error.message);process.exitCode=2;}
}
