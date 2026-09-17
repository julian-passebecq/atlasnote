/** Offline syntax/emit validation is not module resolution, type or runtime verification. */
import fs from 'node:fs/promises';import ts from 'typescript';
const checks=[];for(const path of ['src/online/PdfEngine.tsx','src/online/entry.tsx','src/online/react-runtime.ts']){
 const r=ts.transpileModule(await fs.readFile(path,'utf8'),{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}});
 const errors=(r.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n'));
 checks.push({path,status:errors.length?'FAIL':'PASS',errors,emittedCharacters:r.outputText.length});
}
const report={scope:'Syntax and isolated TypeScript emit ONLY. Installed-module typecheck, bundling and PDF runtime NOT covered.',checks};
await fs.mkdir('docs/evidence/hardening/pdf-static',{recursive:true});await fs.writeFile('docs/evidence/hardening/pdf-static/syntax.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(checks.some(c=>c.status==='FAIL'))process.exit(1);
