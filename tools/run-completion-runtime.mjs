/** Completion acceptance uses fresh synthetic fixtures, never tracked documentation.
 * The browser suite and inherited source-drift guard are deliberately unchanged.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CREDENTIALS = [
  'CLOUDFLARE_API_TOKEN', 'CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET',
  'VERCEL_TOKEN', 'VERCEL_AUTOMATION_BYPASS_SECRET',
];

function exitCode(child) {
  // A timeout, signal or missing executable can never become a passing test.
  if (child.error || child.signal || !Number.isInteger(child.status) || child.status < 0) return 1;
  return child.status;
}

/** Injectable process runner/root are for orchestration unit tests only.
 * The CLI exposes no skip, alternate test script, or success-override flag.
 */
export function runCompletionRuntime({
  run = spawnSync, env = process.env, root = ROOT, tempRoot = os.tmpdir(),
  log = message => console.log(message),
} = {}) {
  const temporary = fs.mkdtempSync(path.join(tempRoot, 'atlasnote-v22-completion-'));
  const fixtures = path.join(temporary, 'examples');
  const childEnv = {...env, ATLAS_V22_EXAMPLES_DIR: fixtures};
  for (const name of CREDENTIALS) delete childEnv[name];
  const options = {cwd: root, env: childEnv, stdio: 'inherit', shell: false, windowsHide: true};
  try {
    log('Generating fresh synthetic completion fixtures outside the repository.');
    const generated = run(process.execPath, [
      path.join(root, 'tools/generate-v22-examples.mjs'), '--output-dir', fixtures,
    ], {...options, timeout: 120000});
    const generatedCode = exitCode(generated);
    if (generatedCode !== 0) {
      log('Completion fixture generation did not succeed; browser suite was not started.');
      return generatedCode;
    }
    log('Running the unchanged integrated completion browser suite with those fixtures.');
    const browser = run(env.ATLAS_PYTHON || 'python', [
      path.join(root, 'tests/completion_v22_runtime.py'),
    ], {...options, timeout: 900000});
    const code = exitCode(browser);
    if (browser.error || browser.signal) log('Completion browser process failed or was interrupted.');
    return code;
  } finally {
    // Only this invocation's mkdtemp directory is removed. Source and evidence
    // directories are never cleanup targets. Cleanup failure propagates as failure.
    fs.rmSync(temporary, {recursive: true, force: true, maxRetries: 3, retryDelay: 100});
    log('Temporary completion fixture directory removed.');
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 2) throw new Error('No CLI flags are supported.');
    process.exitCode = runCompletionRuntime();
  } catch {
    // Do not echo process environments, credentials or captured child output.
    console.error('Completion runtime setup/cleanup failed; no passing result is claimed.');
    process.exitCode = 1;
  }
}
