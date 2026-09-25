/** V3 Norsk Daily view model over SYNTHETIC fixtures (unit level, not browser evidence). */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {projectNorskDailyFeed} from '../dist-offline/app/norsk-daily/projection.js';
import {dailyBatches,dailyStatus,dailyCounts,STATUS_RATING} from '../dist-offline/app/norsk-daily/daily.js';
import {blankWorkspace,compose} from '../dist-offline/app/core/workspace.js';
import {validatePersonal} from '../dist-offline/app/storage/personal-validation.mjs';
import {blankPersonal} from '../dist-offline/app/core/workspace.js';
const fixture=JSON.parse(await fs.readFile('examples/norsk-daily/synthetic-2026-09-24.json','utf8'));
const built=JSON.parse(await fs.readFile('dist-offline/content.json','utf8'));
function catalogueWith(feed){const p=projectNorskDailyFeed(feed),c=compose(built,blankWorkspace());return {...c,pages:[...c.pages,...p.articles.map(a=>a.page),...(p.qcm?[p.qcm.page]:[])]};}

test('V3 Norsk Daily view groups accepted items by Oslo study day with the day QCM',()=>{
 const batches=dailyBatches(catalogueWith(fixture),{});
 assert.equal(batches.length,1);const b=batches[0];
 assert.equal(b.date,fixture.studyDate);assert.equal(b.synthetic,true,'synthetic fixture is labelled');
 assert(b.items.length>=2);assert(b.items.every(i=>i.status==='new'));
 assert(b.qcm&&b.qcm.kind==='qcm');
 assert(b.items.some(i=>i.language==='nn'),'Nynorsk item kept');
 assert(b.items.every(i=>typeof i.english==='string'&&i.english.length>0),'English comes from the generated translation block');
 assert(b.items.some(i=>i.grammar.length>0),'grammar links exposed');
});
test('V3 Norsk Daily progress reuses learning flags; queue orders New, Learning, Known',()=>{
 assert.equal(dailyStatus(undefined),'new');assert.equal(dailyStatus('gray'),'new');assert.equal(dailyStatus('red'),'learning');assert.equal(dailyStatus('orange'),'learning');assert.equal(dailyStatus('green'),'known');
 const c=catalogueWith(fixture),ids=dailyBatches(c,{})[0].items.map(i=>i.page.id);
 const ratings={[ids[0]]:STATUS_RATING.known,[ids[1]]:STATUS_RATING.learning};
 const items=dailyBatches(c,ratings)[0].items;
 assert.deepEqual(items.map(i=>i.status).slice(-2),['learning','known']);
 assert.deepEqual(dailyCounts(items),{new:items.length-2,learning:1,known:1});
 // The flags are ordinary validated personal state (no second progress store).
 const p=blankPersonal();Object.assign(p.ratings,ratings);validatePersonal(p);
});
test('V3 Norsk Daily progress survives a corrected item revision and a later batch',()=>{
 const c1=catalogueWith(fixture),first=dailyBatches(c1,{})[0].items[0].page.id,ratings={[first]:'green'};
 const corrected=structuredClone(fixture);const item=corrected.items.find(i=>'norsk-daily.item.'+i.itemId===first);item.revision+=1;
 corrected.batchRevision+=1;
 const after=dailyBatches(catalogueWith(corrected),ratings)[0].items.find(i=>i.page.id===first);
 assert.equal(after.status,'known','same stable page ID keeps progress across revisions');
 assert(after.page.tags.includes('norsk-daily-revision:'+item.revision));
});
test('V3 Norsk Daily vocabulary review reads the accepted vocabulary tables, deduplicated',async()=>{
 const {dailyVocabulary}=await import('../dist-offline/app/norsk-daily/daily.js');
 const c=catalogueWith(fixture),batch=dailyBatches(c,{})[0],words=dailyVocabulary(batch);
 const expected=new Set(fixture.items.flatMap(i=>i.vocabulary.map(v=>v.lemma.toLocaleLowerCase('nb')+'|'+v.partOfSpeech)));
 assert.equal(words.length,expected.size,'one card per distinct lemma + part of speech');
 assert(words.every(w=>w.english&&w.pageId.startsWith('norsk-daily.item.')&&w.headline));
 assert.deepEqual(dailyVocabulary(undefined),[]);
});
test('V3 Norsk Daily vocabulary becomes a reviewable concept.create proposal (never applied directly)',async()=>{
 const {dailyVocabulary,vocabularyChangeSet,vocabularyConceptId,VOCABULARY_BATCH_LIMIT}=await import('../dist-offline/app/norsk-daily/daily.js');
 const {validateChangeSet}=await import('../dist-offline/app/agent/service.js');
 assert.equal(vocabularyConceptId({lemma:'høst',partOfSpeech:'noun'}),'concept.norsk.vocab.host-noun');
 assert.equal(vocabularyConceptId({lemma:'å få',partOfSpeech:'verb'}),'concept.norsk.vocab.a-fa-verb');
 assert.equal(vocabularyConceptId({lemma:'Ærlig'}),'concept.norsk.vocab.aerlig');
 const words=dailyVocabulary(dailyBatches(catalogueWith(fixture),{})[0]);
 const built=vocabularyChangeSet(words,fixture.studyDate,'0123456789abcdef',1);
 assert.equal(built.changeSet.operations.length,words.length);assert.equal(built.omitted,0);
 assert(built.changeSet.operations.every(o=>o.kind==='concept.create'&&o.payload.subject==='norsk'&&o.payload.assignTo.kind==='article'&&o.payload.parentId==='concept.norsk'));
 validateChangeSet(built.changeSet);
 const many=Array.from({length:60},(_,i)=>({...words[0],lemma:words[0].lemma+i}));
 const capped=vocabularyChangeSet(many,fixture.studyDate,'0123456789abcdef',1);
 assert.equal(capped.changeSet.operations.length,VOCABULARY_BATCH_LIMIT);assert.equal(capped.omitted,10);
 assert.equal(vocabularyChangeSet([],fixture.studyDate,'0123456789abcdef',1),undefined);
});
