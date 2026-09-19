/** Run interactively on the owner's computer. Never run in CI or redirect output. */
import {randomBytes, createHash} from 'node:crypto';
import {mkdir, open, lstat, realpath} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function generateAccessMaterial() {
 const key = 'atlas1_' + randomBytes(32).toString('base64url');
 return {key, verifier: createHash('sha256').update(key, 'utf8').digest('hex')};
}
export async function saveOwnerKey(key) {
 const home = await realpath(os.homedir());
 const directory = path.join(home, '.atlasnote');
 const repo = await realpath(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
 if (directory === repo || directory.startsWith(repo + path.sep)) throw Error('Refusing to save an access key inside the repository.');
 await mkdir(directory, {recursive: true, mode: 0o700});
 const info = await lstat(directory);
 if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) throw Error('Key directory must be a real private local directory.');
 if (process.platform !== 'win32' && (info.mode & 0o077)) throw Error('Key directory must be private (chmod 700 ~/.atlasnote).');
 const filename = path.join(directory, 'access-key.txt');
 const file = await open(filename, 'wx', 0o600); // Never follow/overwrite an existing file or symlink.
 try { await file.writeFile(key + '\n', 'utf8'); await file.sync(); } finally { await file.close(); }
 return filename;
}
export async function main(args = process.argv.slice(2)) {
 if (args.some(arg => arg !== '--save') || args.length > 1) throw Error('Usage: npm run access-key:generate -- [--save]');
 if (process.env.CI || !process.stdout.isTTY || !process.stdin.isTTY) throw Error('Run this helper in a private interactive terminal, not CI, a pipe, or redirected logs.');
 const {key, verifier} = generateAccessMaterial();
 if (args.includes('--save')) console.log('Private key saved (not printed): ' + await saveOwnerKey(key));
 else console.log('Private one-time access key (keep private; do not copy into Git or logs):\n' + key);
 console.log('\nSet this value only in Netlify runtime Functions environment configuration:\nATLASNOTE_ACCESS_KEY_SHA256=' + verifier);
 console.log('\nDo not use VITE_* variables. Paste the private key into the unlock form once per new browser. Rotating the verifier requires a new Netlify deploy.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Key generation refused or failed. Use a private interactive terminal; an existing key file is never overwritten. See docs/v23/ACCESS_CONTROL.md.'); process.exitCode = 1; });
