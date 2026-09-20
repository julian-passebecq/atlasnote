import {defineConfig} from 'vite';import {fileURLToPath} from 'node:url';
export default defineConfig({
 base:'/',publicDir:'.vite-public',
 resolve:{alias:[{find:/^(?:\.{1,2}\/)+vendor\/react\.mjs$/,replacement:fileURLToPath(new URL('./src/online/react-runtime.ts',import.meta.url))}]},
 build:{outDir:'dist',emptyOutDir:true,target:'es2022',sourcemap:false,
  rollupOptions:{preserveEntrySignatures:'strict',input:{agent:fileURLToPath(new URL('./src/agent/public.ts',import.meta.url)),main:fileURLToPath(new URL('./index.html',import.meta.url)),snapshot:fileURLToPath(new URL('./src/storage/workspace-snapshot.ts',import.meta.url))},
   output:{entryFileNames:chunk=>chunk.name==='agent'?'app/agent/public.js':chunk.name==='snapshot'?'app/storage/workspace-snapshot.js':'assets/[name]-[hash].js'}}},
 esbuild:{jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}
});
