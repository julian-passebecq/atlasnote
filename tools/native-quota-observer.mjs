/** Derive passive CDP observers from semantic AST structure, never minified names. */
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const PREFLIGHT_WARNING='An estimate is not a reservation. The actual IndexedDB transaction can still fail without a partial commit.';
const CONCURRENCY_ERROR='Another tab changed resource history. Reload before applying this edit. Nothing was overwritten.';
const descendants=node=>{const out=[];const visit=n=>{out.push(n);ts.forEachChild(n,visit);};visit(node);return out;};
const literal=node=>node&&(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))?node.text:undefined;
const propertyName=node=>ts.isIdentifier(node)||ts.isStringLiteral(node)?node.text:undefined;
function one(nodes,label){assert.equal(nodes.length,1,'Exactly one '+label+' is required; refuse ambiguous instrumentation');return nodes[0];}
function passiveExpression(node){
 for(const n of descendants(node)){
  assert(!ts.isCallExpression(n)&&!ts.isNewExpression(n)&&!ts.isAwaitExpression(n)&&!ts.isYieldExpression(n)&&!ts.isFunctionExpression(n)&&!ts.isArrowFunction(n),'Preflight observer must only read a side-effect-free result expression');
  if(ts.isBinaryExpression(n))assert(n.operatorToken.kind<ts.SyntaxKind.FirstAssignment||n.operatorToken.kind>ts.SyntaxKind.LastAssignment,'Observer cannot assign app state');
  if(ts.isPrefixUnaryExpression(n)||ts.isPostfixUnaryExpression(n))assert(n.operator!==ts.SyntaxKind.PlusPlusToken&&n.operator!==ts.SyntaxKind.MinusMinusToken,'Observer cannot mutate app state');
 }
}
export function nativeQuotaObservers(code){
 const tree=ts.createSourceFile('database.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.equal(tree.parseDiagnostics.length,0,'Integrated bundle must parse before passive observation');
 const all=descendants(tree);
 const result=one(all.filter(n=>ts.isReturnStatement(n)&&n.expression&&ts.isObjectLiteralExpression(n.expression)&&n.expression.properties.some(p=>ts.isPropertyAssignment(p)&&propertyName(p.name)==='warning'&&literal(p.initializer)===PREFLIGHT_WARNING)),'preflight return object');
 const properties=result.expression.properties;
 assert.deepEqual(properties.map(p=>propertyName(p.name)).sort(),['available','incomingBytes','required','status','warning']);
 assert(properties.every(ts.isPropertyAssignment),'Preflight result fields must be plain assignments');
 passiveExpression(result.expression);
 let preflight=result.parent;while(preflight&&!ts.isFunctionDeclaration(preflight))preflight=preflight.parent;
 assert(preflight?.name&&preflight.parameters.length===2,'Preflight must remain an explicit unmodified function');
 const exportAlias=one(all.filter(n=>ts.isExportSpecifier(n)&&(n.propertyName?.text??n.name.text)===preflight.name.text),'preflight export').name.text;
 const transactionFunction=one(all.filter(n=>ts.isFunctionDeclaration(n)&&descendants(n).some(child=>literal(child)===CONCURRENCY_ERROR)),'authored projection transaction function');
 const declarations=descendants(transactionFunction).filter(n=>ts.isVariableDeclaration(n)&&ts.isIdentifier(n.name)&&n.initializer&&ts.isCallExpression(n.initializer)&&ts.isPropertyAccessExpression(n.initializer.expression)&&n.initializer.expression.name.text==='transaction'&&literal(n.initializer.arguments[1])==='readwrite');
 const transaction=one(declarations,'native authored readwrite transaction');
 const tryStatement=one(transactionFunction.body.statements.filter(n=>ts.isTryStatement(n)&&n.getStart(tree)>transaction.getEnd()),'top-level authored transaction try statement');
 const location=node=>{const start=node.getStart(tree),at=tree.getLineAndCharacterOfPosition(start);return {lineNumber:at.line,columnNumber:at.character};};
 const tx=transaction.name.text;
 return {
  preflightExport:exportAlias,
  preflight:{...location(result),condition:'(window.__nativeEvents.push({type:"preflight-permitted",phase:window.__nativePhase,result:('+result.expression.getText(tree)+')}),false)'},
  transaction:{...location(tryStatement),condition:'(window.__nativeEvents.push({type:"native-transaction-created",phase:window.__nativePhase,stores:[...'+tx+'.objectStoreNames]}),'+tx+'.addEventListener("abort",e=>window.__nativeEvents.push({type:"abort",trusted:e.isTrusted,error:'+tx+'.error?.name,message:'+tx+'.error?.message})),'+tx+'.addEventListener("complete",e=>window.__nativeEvents.push({type:"complete",trusted:e.isTrusted})),false)'}
 };
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 assert.equal(process.argv.length,3,'Supply the exact integrated database bundle path');
 console.log(JSON.stringify(nativeQuotaObservers(fs.readFileSync(process.argv[2],'utf8'))));
}
