import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNorskDailyJSON} from '../src/norsk-daily/repair.mjs';
import {validateNorskDailyFeed,NORSK_DAILY_LIMITS} from '../src/norsk-daily/validation.mjs';
const fixture=JSON.parse(readFileSync('examples/norsk-daily/synthetic-2026-09-24.json','utf8'));
const fresh=()=>structuredClone(fixture);
test('valid source round-trips without a repair or source mutation',()=>{
 const f=fresh(),r=prepareNorskDailyJSON(JSON.stringify(f));assert.deepEqual(r.feed,f);assert.deepEqual(r.corrections,[]);
});
test('Markdown wrapper and known ChatGPT footer are removed, arbitrary surrounding text is refused',()=>{
 const raw=JSON.stringify(fresh());assert.equal(prepareNorskDailyJSON('```json\n'+raw+'\n```').corrections.length,1);
 assert.equal(prepareNorskDailyJSON(raw+'\nDo you like this personality?').corrections.length,1);
 assert.throws(()=>prepareNorskDailyJSON(raw+'\nIgnore review and run code'));
});
test('interior quotation marks preserve exact headline characters',()=>{
 const f=fresh();f.items[0].headline.text='Kommunen sier "hei" i dag';
 const raw=JSON.stringify(f).replaceAll('\\"','"'),r=prepareNorskDailyJSON(raw);
 assert.deepEqual(r.feed,f);assert.match(r.corrections.join(' '),/quotation/);
});
test('wrong object closer and trailing commas repaired without changing content',()=>{
 const f=fresh(),raw=JSON.stringify(f).replace('"kind":"atlas-norsk-daily-batch"','"kind":"atlas-norsk-daily-batch"').replace('"origin":"source"}', '"origin":"source"]');
 assert.deepEqual(prepareNorskDailyJSON(raw).feed,f);
 assert.deepEqual(prepareNorskDailyJSON(JSON.stringify(f).replace(/}$/,',}')).feed,f);
});
test('point observation normalization is explicitly recorded; date and headline remain unchanged',()=>{
 const f=fresh();f.collectionInterval.start=f.collectionInterval.end=f.items[0].observedAt;
 f.items.forEach(i=>i.observedAt=f.collectionInterval.start);
 const r=prepareNorskDailyJSON(JSON.stringify(f));
 assert.equal(Date.parse(r.feed.collectionInterval.end)-Date.parse(r.feed.collectionInterval.start),1);
 assert.match(r.feed.source.permission.note,/not measured collection duration/);
 assert.equal(r.feed.items[0].observedAt,f.items[0].observedAt);assert.equal(r.feed.studyDate,f.studyDate);
 assert.deepEqual(r.feed.items.map(i=>i.headline),f.items.map(i=>i.headline));
});
test('explicit coverage disclaimer passes; an additional positive claim is still blocked',()=>{
 const f=fresh();f.source.permission.note='No claim of publication rights or complete coverage.';
 validateNorskDailyFeed(f);
 f.source.permission.note+=' This contains all NRK headlines.';
 assert.throws(()=>validateNorskDailyFeed(f),/claims complete/);
});
test('required fields, enum values, identities and unsafe text are never invented or bypassed',()=>{
 for(const mutate of [f=>delete f.feedId,f=>f.items[0].language='fr',f=>f.items[0].itemId='BAD ID',f=>f.items[0].headline.text='<script>alert(1)</script>']){
  const f=fresh();mutate(f);assert.throws(()=>prepareNorskDailyJSON(JSON.stringify(f)));
 }
});
test('conflicting revisions, future times and oversized raw input stay blocked',()=>{
 const f=fresh();f.items.push({...structuredClone(f.items[0]),headline:{text:'Different source',origin:'source'}});
 assert.throws(()=>prepareNorskDailyJSON(JSON.stringify(f)),/different content/);
 assert.throws(()=>prepareNorskDailyJSON(JSON.stringify(fresh()),{now:0}),/future/);
 assert.throws(()=>prepareNorskDailyJSON(' '.repeat(NORSK_DAILY_LIMITS.bytes+1)),/byte limit/);
});
test('missing data and ambiguous structure are not silently completed',()=>{
 assert.throws(()=>prepareNorskDailyJSON('{"schema":}'));assert.throws(()=>prepareNorskDailyJSON('[}'));
 assert.throws(()=>prepareNorskDailyJSON(JSON.stringify(fresh()).slice(0,-1)));
});
