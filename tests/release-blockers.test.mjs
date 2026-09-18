import test from 'node:test';
import assert from 'node:assert/strict';
import {qcmAnswerModes,validateQcmDraftModes} from '../dist-offline/app/content-hub/qcm-draft.js';
import {validateQcm} from '../src/content-hub/validation.mjs';
const saved=()=>({schemaVersion:1,id:'regression.qcm',title:'Multiple',questions:[{id:'q1',prompt:'Both?',options:[{id:'a',text:'A'},{id:'b',text:'B'}],correctOptionIds:['a','b']}]});
test('QA-03 saved Multiple retains author mode across temporarily invalid answer counts',()=>{
 const doc=saved(),modes=qcmAnswerModes(doc);doc.questions[0].correctOptionIds.pop();
 assert.equal(modes.q1,true);assert.throws(()=>validateQcmDraftModes(doc,modes),/at least two/);
 doc.questions[0].correctOptionIds=[];assert.throws(()=>validateQcmDraftModes(doc,modes),/at least two/);
 doc.questions[0].correctOptionIds=['a','b'];assert.doesNotThrow(()=>validateQcmDraftModes(doc,modes));
});
test('QA-03 deliberate Single mode accepts one answer without weakening canonical validation',()=>{
 const doc=saved(),modes=qcmAnswerModes(doc);modes.q1=false;doc.questions[0].correctOptionIds=['a'];
 validateQcmDraftModes(doc,modes);validateQcm(doc);
 doc.questions[0].correctOptionIds=[];assert.throws(()=>validateQcm(doc),/correct answers/);
});
test('QA-03 valid canonical round trips retain mode and stable source identities',()=>{
 const doc=saved(),roundTrip=JSON.parse(JSON.stringify(doc));validateQcm(roundTrip);
 assert.deepEqual(qcmAnswerModes(roundTrip),{q1:true});assert.deepEqual(roundTrip,doc);
});
