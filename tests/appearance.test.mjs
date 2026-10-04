import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {SHEET_PALETTES,sheetThemeFor,appearancePresetFor} from '../src/core/appearance.mjs';
import {renderCheatsheetPage} from '../src/cheatsheets/renderer.mjs';
import {validatePersonal} from '../src/storage/personal-validation.mjs';
import {blankPersonal} from '../dist-offline/app/core/workspace.js';
import {saveReadingState} from '../dist-offline/app/core/saved-states.js';
const doc=JSON.parse(await fs.readFile('content/cheatsheets/sql-analytics.json','utf8'));
const luminance=hex=>{const c=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const contrast=(a,b)=>{const [x,y]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (x+.05)/(y+.05);};
test('Dark sheets retain text, physical frames and namespaced IDs without changing canonical artwork',()=>{
 const before=JSON.stringify(doc),source=renderCheatsheetPage(doc,1).svg,dark=renderCheatsheetPage(doc,1,{sheetTheme:'black'}).svg;
 const attrs=s=>[...s.matchAll(/(?:data-frame|data-block-id|viewBox|clip-path|id)="[^"]*"/g)].map(m=>m[0]);
 const text=s=>[...s.matchAll(/>([^<>]+)</g)].map(m=>m[1]);
 assert.deepEqual(attrs(dark),attrs(source));assert.deepEqual(text(dark),text(source));assert.equal(JSON.stringify(doc),before);
 assert.match(dark,/fill="#141517"/);assert.doesNotMatch(dark,/filter=|invert\(/);assert.equal(renderCheatsheetPage(doc,1).svg,source);
 assert.throws(()=>renderCheatsheetPage(doc,1,{sheetTheme:'black" onload="bad'}),/Unknown sheet/);
});
test('Dark palettes keep all reading roles legible over their relevant surfaces',()=>{
 for(const name of ['black','slate']){const p=SHEET_PALETTES[name];for(const [text,background] of [['ink','paper'],['primary','paper'],['caption','paper'],['example','code'],['ink','code'],['ink','box'],['warning','warningFill'],['primary','tableHead'],['ink','stripe']])assert.ok(contrast(p[text],p[background])>=4.5,`${name} ${text}/${background}`);}
});
test('New sessions default to black/black while legacy theme choices are retained',()=>{
 const p=blankPersonal();assert.equal(p.session.theme,'black');assert.equal(p.session.sheetTheme,'black');assert.equal(appearancePresetFor(p.session),'midnight');
 assert.equal(sheetThemeFor({theme:'fluent'}),'source');assert.equal(sheetThemeFor({theme:'slate'}),'slate');assert.equal(appearancePresetFor({theme:'black',sheetTheme:'paper'}),'custom');
});
test('Independent sheet settings survive personal and saved-checkpoint validation',()=>{
 const p=blankPersonal();p.session.sheetTheme='warm';validatePersonal(p);saveReadingState(p,1,'Independent appearance',1);validatePersonal(p);
 assert.equal(p.savedStates.entries[0].session.sheetTheme,'warm');p.session.sheetTheme='invalid';assert.throws(()=>validatePersonal(p),/sheet theme/);
});
