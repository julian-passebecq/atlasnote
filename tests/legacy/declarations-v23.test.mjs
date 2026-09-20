import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateEdgeDeclarations} from '../../tools/check-access-netlify.mjs';
import {config as auth} from '../../netlify/edge-functions/atlas-auth.js';import {config as unlock} from '../../netlify/edge-functions/atlas-unlock.js';import {config as lock} from '../../netlify/edge-functions/atlas-lock.js';
const config={auth,unlock,lock},toml=fs.readFileSync('netlify.toml','utf8');
test('V23 exact reviewed routing declaration passes',()=>validateEdgeDeclarations(config,toml));
for(const [key,value] of Object.entries({method:'GET',header:{x:'y'},pattern:'/private',excludedPattern:'/assets',cache:'manual',onError:'continue'}))test('V23 routing restriction '+key+' cannot silently pass',()=>{const c=structuredClone(config);c.auth[key]=value;assert.throws(()=>validateEdgeDeclarations(c,toml));});
for(const name of ['auth','unlock','lock'])test('V23 rejects extra '+name+' routing predicates',()=>{const c=structuredClone(config);c[name].method='POST';assert.throws(()=>validateEdgeDeclarations(c,toml));});
for(const value of [toml.replace('publish = "dist"','publish = "public"'),toml+'\n[[edge_functions]]\npath="/*"',toml+'\n[context.production]\npublish="public"'])test('V23 rejects provider config shadow',()=>assert.throws(()=>validateEdgeDeclarations(config,value)));
