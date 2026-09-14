/** Explicit opt-in browser test bundle, outside the hosted distribution. */
import {build,mergeConfig} from 'vite';
import fs from 'node:fs/promises';
import config from '../vite.config.mjs';
import path from 'node:path';
await build(mergeConfig(config,{configFile:false,build:{outDir:'.build/engine-dom',rollupOptions:{input:{harness:path.resolve('tests/fixtures/engine-dom-entry.tsx')},output:{entryFileNames:'assets/[name]-[hash].js'}}}}));
await fs.writeFile('.build/engine-dom/index.html','<!doctype html><title>Test harness resources only</title>');
