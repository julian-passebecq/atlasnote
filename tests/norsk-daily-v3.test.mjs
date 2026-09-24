/** V3 Norsk Daily feed adapter. SYNTHETIC fixtures and a unit memory backend
 * only: this is not IndexedDB/browser evidence and not evidence of any
 * publisher permission. Real-source publication remains blocked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {setup,built} from './v22/fixtures.mjs';
import {stable} from '../src/core/validation.mjs';
import {validateNorskDailyFeed,parseNorskDailyJSON,osloDayInterval,osloDateOf,NORSK_DAILY_LIMITS as L} from '../dist-offline/app/norsk-daily/validation.mjs';
import {projectNorskDailyFeed,questionIdFor,articlePageId,qcmPageId} from '../dist-offline/app/norsk-daily/projection.js';
import {planNorskDailyImport,lookupFromAgent,previewNorskDailyImport} from '../dist-offline/app/norsk-daily/import.js';
import {norskDailyJsonSchema,buildTransformationPrompt} from '../dist-offline/app/norsk-daily/contract.js';
import {answerQuestion,qcmProgress} from '../dist-offline/app/content-hub/content.js';
import {resourceAdapters} from '../dist-offline/app/history/adapters.js';
import {compose} from '../dist-offline/app/core/workspace.js';

const FIXTURE_PATH='examples/norsk-daily/synthetic-2026-09-24.json';
const fixtureText=await fs.readFile(FIXTURE_PATH,'utf8'),fixture=JSON.parse(fixtureText);
const feed=()=>structuredClone(fixture);
const invalid=(mutate,re)=>{const f=feed();mutate(f);assert.throws(()=>validateNorskDailyFeed(f),re);};
const item=(f,i=0)=>f.items[i];
const K={a1:'article:'+articlePageId('synthetic-fixture-0001'),a2:'article:'+articlePageId('synthetic-fixture-0002'),a3:'article:'+articlePageId('synthetic-fixture-0003'),qcm:'qcm:'+qcmPageId('synthetic-2026-09-24')};
let n=0;const opts=()=>({createdAt:1790000000000+(++n),changeSetId:'norsk-daily.test.'+n});
async function importFeed(api,value){const p=planNorskDailyImport(value,lookupFromAgent(api),opts());if(p.changeSet){api.preview(p.changeSet);await api.stage(p.changeSet);await api.accept(p.changeSet.id);}return p;}
/** A correction: item 1 headline/question fixed as revision 2 in batch revision 2. */
function correction(){const f=feed();f.batchRevision=2;const i=item(f);i.revision=2;i.headline.text='Kommunen tester en ny sykkelvei langs fjorden i to uker';i.study.translations.en.text='The municipality is testing a new cycle path along the fjord for two weeks.';i.questions[0].prompt='How long does the municipality test the cycle path?';i.questions[0].options=[{optionId:'a',text:'Two weeks'},{optionId:'b',text:'Two years'}];return f;}

test('V3 Norsk synthetic fixture is valid, visibly synthetic and validation is non-mutating',()=>{
 const before=stable(fixture),v=validateNorskDailyFeed(fixture);assert.equal(stable(fixture),before);assert.equal(stable(v),before);assert.notEqual(v,fixture);
 assert.equal(fixture.source.publisher,'SYNTHETIC-FIXTURE');assert.equal(fixture.source.permission.status,'synthetic-fixture');assert.equal(fixture.review.status,'proposal');
 assert.doesNotMatch(fixtureText,/nrk\.no|\bNRK\b/i,'The synthetic fixture must not contain real NRK URLs or headlines');
 for(const i of fixture.items)if(i.sourceUrl)assert.match(new URL(i.sourceUrl).hostname,/\.invalid$/);
 assert.equal(stable(parseNorskDailyJSON(fixtureText)),before);assert.equal(stable(parseNorskDailyJSON('﻿'+fixtureText)),before);
});

test('V3 Norsk schema/version/envelope failures are explicit',()=>{
 invalid(f=>{f.schemaVersion=1;},/draft is not importable/);
 invalid(f=>{f.schemaVersion=3;},/future major version/);
 invalid(f=>{f.kind='atlas-agent-changeset';},/expected schema/);
 invalid(f=>{f.extra=true;},/unknown field "extra"/);
 invalid(f=>{delete f.coverage;},/missing required field "coverage"/);
 invalid(f=>{f.timezone='UTC';},/Europe\/Oslo/);
 invalid(f=>{f.studyDate='2026-02-30';},/calendar date/);
 invalid(f=>{f.feedId='Norsk Daily';},/feedId/);
 invalid(f=>{f.batchRevision=0;},/batchRevision/);
 invalid(f=>{f.review.status='accepted';},/cannot declare itself reviewed/);
 invalid(f=>{f.transform.promptId='other@1';},/promptId/);
 invalid(f=>{f.source.publisher='Fixture';},/visibly labelled SYNTHETIC/);
 invalid(f=>{f.transform.method='explicit-user-chatgpt';},/used together/);
 invalid(f=>{f.source.permission.status='publisher-permission-verified';},/permission\.status/);
 assert.throws(()=>parseNorskDailyJSON('{"schema": "atlas.norsk-daily", /* c */}'),/malformed JSON/);
 assert.throws(()=>parseNorskDailyJSON(' '.repeat(L.bytes+1)),/exceeds/);
 assert.throws(()=>validateNorskDailyFeed({...feed(),items:[...feed().items,...Array(L.items).fill(item(feed()))]}),/items must contain 1-40/);
 const huge=feed();huge.items=Array.from({length:L.items},(_,i)=>({...structuredClone(item(fixture)),itemId:'synthetic-fixture-'+String(i).padStart(4,'0'),sourceId:'s-'+i,study:{...item(fixture).study,paraphrase:{text:'x'.repeat(L.paraphraseChars),origin:'generated'},translations:{en:{text:'y'.repeat(L.translationChars),origin:'generated'},fr:{text:'z'.repeat(L.translationChars),origin:'generated'}},uncertainty:Array(L.uncertainty).fill('u'.repeat(L.uncertaintyChars))},
  vocabulary:Array.from({length:L.vocabulary},(_,j)=>({lemma:'ord'+j,partOfSpeech:'noun',en:'e'.repeat(L.glossChars),fr:'f'.repeat(L.glossChars),example:{text:'x'.repeat(L.exampleChars),origin:'generated'}}))}));
 assert.doesNotThrow(()=>validateNorskDailyFeed({...huge,items:huge.items.slice(0,20)}),'Every individual field is within bounds');
 assert.throws(()=>validateNorskDailyFeed(huge),/bytes/);
 assert.throws(()=>validateNorskDailyFeed(feed(),{now:Date.parse('2026-09-24T04:00:00Z')}),/future/);
});

test('V3 Norsk string, array and identity bounds reject rather than truncate',()=>{
 invalid(f=>{f.items=[];},/1-40/);
 invalid(f=>{item(f).headline.text='a'.repeat(L.headlineChars+1);},/headline\.text exceeds 200/);
 invalid(f=>{item(f).headline.text='  ';},/headline\.text is required/);
 invalid(f=>{item(f).study.paraphrase.text='a'.repeat(L.paraphraseChars+1);},/paraphrase\.text exceeds/);
 invalid(f=>{item(f).study.translations.en.text='a'.repeat(L.translationChars+1);},/translations\.en\.text exceeds/);
 invalid(f=>{item(f).vocabulary=[];},/vocabulary must contain 1-8/);
 invalid(f=>{item(f).vocabulary=Array.from({length:9},(_,i)=>({lemma:'ord'+i,partOfSpeech:'noun',en:'word'}));},/vocabulary must contain 1-8/);
 invalid(f=>{item(f).vocabulary.push({...item(f).vocabulary[0]});},/duplicates lemma/);
 invalid(f=>{item(f).vocabulary[0].partOfSpeech='verbish';},/partOfSpeech/);
 invalid(f=>{item(f).grammar=Array.from({length:5},(_,i)=>({pageId:'page.g'+i,label:'G'}));},/grammar must contain 0-4/);
 invalid(f=>{item(f).grammar[0].pageId='../etc';},/pageId/);
 invalid(f=>{item(f).questions=Array.from({length:4},(_,i)=>({...item(f).questions[0],questionId:'q'+i}));},/questions must contain 0-3/);
 invalid(f=>{item(f).questions[0].options=[{optionId:'a',text:'Only'}];},/options must contain 2-5/);
 invalid(f=>{item(f).questions[0].correctOptionIds=['z'];},/unique existing option IDs/);
 invalid(f=>{item(f).questions[0].origin='source';},/origin must be "generated"/);
 invalid(f=>{item(f).itemId='Synthetic_0001';},/itemId/);
 invalid(f=>{item(f).itemId='x'.repeat(65);},/itemId/);
 invalid(f=>{item(f).revision=1.5;},/revision must be an integer/);
 invalid(f=>{item(f).sourceId='has space';},/sourceId/);
 invalid(f=>{item(f).section='s'.repeat(L.sectionChars+1);},/section exceeds/);
 invalid(f=>{item(f).study.uncertainty=Array(L.uncertainty+1).fill('?');},/uncertainty must contain/);
 invalid(f=>{item(f).unknown=1;},/unknown field "unknown"/);
});

test('V3 Norsk timestamps respect Europe/Oslo day, collection interval and unknown publication time',()=>{
 invalid(f=>{f.collectionInterval.start='2026-09-23T23:59:00+02:00';},/within the Europe\/Oslo study day/);
 invalid(f=>{f.collectionInterval.end='2026-09-25T00:00:01+02:00';},/within the Europe\/Oslo study day/);
 invalid(f=>{f.collectionInterval.end=f.collectionInterval.start;},/must precede/);
 invalid(f=>{f.collectionInterval.start='2026-09-24T06:00:00';},/explicit offset/);
 invalid(f=>{f.generatedAt='2026-09-24T06:30:00+02:00';},/generatedAt cannot precede/);
 invalid(f=>{item(f).observedAt='2026-09-24T08:00:00+02:00';},/within collectionInterval/);
 invalid(f=>{item(f).sourcePublishedAt='2026-09-24T06:30:00+02:00';},/after observedAt/);
 invalid(f=>{item(f).sourcePublishedAt='2026-09-24T25:00:00+02:00';},/clock time/);
 invalid(f=>{delete item(f).sourcePublishedAt;},/sourcePublishedAt/);
 // Unknown publication time remains explicit null; a previous-day source time is kept separate from the observed day.
 const v=validateNorskDailyFeed(fixture);assert.equal(v.items[1].sourcePublishedAt,null);
 const p=projectNorskDailyFeed(fixture);assert.equal(p.articles.find(a=>a.itemId==='synthetic-fixture-0003').reappeared,true);assert.equal(p.articles.find(a=>a.itemId==='synthetic-fixture-0001').reappeared,false);
 assert.match(p.articles[1].page.blocks[0].text,/Published: unknown/);
});

test('V3 Norsk Oslo days are half-open local midnights across DST, not fixed 24h UTC days',()=>{
 const hours=d=>{const i=osloDayInterval(d);return (i.end-i.start)/3600000;};
 assert.equal(hours('2026-09-24'),24);assert.equal(hours('2026-03-29'),23);assert.equal(hours('2026-10-25'),25);
 assert.equal(osloDayInterval('2026-09-24').start,Date.parse('2026-09-23T22:00:00Z'));assert.equal(osloDayInterval('2026-01-15').start,Date.parse('2026-01-14T23:00:00Z'));
 assert.equal(osloDateOf(Date.parse('2026-09-23T22:30:00Z')),'2026-09-24');
 // 23:30+01:00 on the 25-hour day is still inside that study day.
 const f=feed();f.studyDate='2026-10-25';f.batchId='synthetic-2026-10-25';f.collectionInterval={start:'2026-10-25T00:00:00+02:00',end:'2026-10-25T23:30:00+01:00'};f.generatedAt='2026-10-25T23:45:00+01:00';for(const i of f.items){i.observedAt='2026-10-25T12:00:00+01:00';if(i.sourcePublishedAt)i.sourcePublishedAt='2026-10-25T11:00:00+01:00';}
 validateNorskDailyFeed(f);f.collectionInterval.end='2026-10-26T00:00:01+01:00';assert.throws(()=>validateNorskDailyFeed(f),/study day/);
});

test('V3 Norsk sourceUrl is validated metadata only; no executable content or embedded URLs',()=>{
 invalid(f=>{item(f).sourceUrl='javascript:alert(1)';},/https or http/);
 invalid(f=>{item(f).sourceUrl='https://user:pw@example.invalid/x';},/credentials/);
 invalid(f=>{item(f).sourceUrl='https://other.invalid/x';},/not declared in source\.hosts/);
 invalid(f=>{item(f).sourceUrl='https://127.0.0.1/x';},/IP address/);
 invalid(f=>{item(f).sourceUrl='https://example.invalid:8443/x';},/explicit port/);
 invalid(f=>{item(f).sourceUrl='HTTPS://EXAMPLE.invalid/x';},/canonical form/);
 invalid(f=>{item(f).sourceUrl='https://example.invalid/x?token=abc';},/tokens/);
 invalid(f=>{f.source.hosts=['www.nrk.no'];item(f).sourceUrl='https://www.nrk.no/x';},/reserved example/);
 invalid(f=>{delete f.source.hosts;},/not declared/);
 invalid(f=>{item(f).headline.text='Kommunen <script>alert(1)</script>';},/markup/);
 invalid(f=>{item(f).study.paraphrase.text='Se [her](https://example.invalid)';},/links|URLs/);
 invalid(f=>{item(f).study.translations.en.text='See www.example.invalid for more';},/URLs/);
 invalid(f=>{item(f).vocabulary[0].en='{{constructor}}';},/template/);
 invalid(f=>{item(f).vocabulary[0].en='run `rm -rf`';},/markup/);
 invalid(f=>{item(f).headline.text='Line\u0000break';},/control/);
 invalid(f=>{item(f).headline.text='two\nlines';},/control/);
 invalid(f=>{item(f).headline.text='rev‮ersed';},/bidirectional/);
 invalid(f=>{item(f).headline.text='Café';},/NFC/);
 assert.throws(()=>parseNorskDailyJSON(fixtureText.replace('"review": {','"review": {"__proto__": {"polluted": true},')),/reserved key "__proto__"/);
 assert.equal({}.polluted,undefined);
 invalid(f=>{item(f).qcmAttempts=[];},/personal progress/);
 invalid(f=>{f.progress={};},/personal progress/);
 invalid(f=>{item(f).questions[0].options[0].selectedOptionIds=['a'];},/personal progress/);
});

test('V3 Norsk coverage guard: no "all headlines" without explicit complete-coverage evidence',()=>{
 invalid(f=>{f.coverage.statement='All NRK headlines of the day.';},/claims complete\/all-headline coverage/);
 invalid(f=>{f.coverage.statement='Alle dagens overskrifter fra kilden.';},/claims complete/);
 invalid(f=>{f.coverage.statement='Complete coverage of this morning.';},/claims complete/);
 invalid(f=>{f.coverage.kind='user-selection';f.source.permission.note='Every headline was collected.';},/claims complete/);
 invalid(f=>{f.coverage.kind='complete-subscribed-sources';},/synthetic fixture cannot claim complete/);
 invalid(f=>{f.coverage.completeEvidence={method:'enumerated-subscribed-sources',subscribedSources:['synthetic-fixture'],checkedAt:f.generatedAt,observedItemCount:3};},/only valid for complete-subscribed-sources/);
 const complete=()=>{const f=feed();Object.assign(f.source,{publisher:'Private study source',publisherId:'private-study-source',permission:{status:'user-supplied-private-study',note:'User-supplied headline metadata for private study.'}});f.transform={method:'explicit-user-chatgpt',promptId:'atlas.norsk-daily.prompt@2',tool:'ChatGPT, run by the user'};
  f.collectionInterval={start:'2026-09-24T00:00:00+02:00',end:'2026-09-25T00:00:00+02:00'};f.generatedAt='2026-09-25T00:10:00+02:00';f.coverage={kind:'complete-subscribed-sources',statement:'All headlines of the subscribed source list for the day.',completeEvidence:{method:'enumerated-subscribed-sources',subscribedSources:['private-study-source'],checkedAt:'2026-09-25T00:05:00+02:00',observedItemCount:3}};return f;};
 const ok=complete();assert.doesNotThrow(()=>validateNorskDailyFeed(ok));
 const noEvidence=complete();delete noEvidence.coverage.completeEvidence;assert.throws(()=>validateNorskDailyFeed(noEvidence),/requires coverage\.completeEvidence/);
 const partialDay=complete();partialDay.collectionInterval.start='2026-09-24T06:00:00+02:00';assert.throws(()=>validateNorskDailyFeed(partialDay),/whole Europe\/Oslo study day/);
 const wrongCount=complete();wrongCount.coverage.completeEvidence.observedItemCount=40;assert.throws(()=>validateNorskDailyFeed(wrongCount),/does not match/);
 const earlyCheck=complete();earlyCheck.coverage.completeEvidence.checkedAt='2026-09-24T23:00:00+02:00';assert.throws(()=>validateNorskDailyFeed(earlyCheck),/after the collection interval/);
 const otherSource=complete();otherSource.coverage.completeEvidence.subscribedSources=['another-source'];assert.throws(()=>validateNorskDailyFeed(otherSource),/source\.publisherId/);
});

test('V3 Norsk source wording and generated study text are labelled separately',()=>{
 invalid(f=>{item(f).headline.origin='generated';},/headline\.origin must be "source"/);
 invalid(f=>{item(f).study.translations.en.origin='source';},/must be "generated"/);
 invalid(f=>{item(f).study.paraphrase.origin='source';},/must be "generated"/);
 invalid(f=>{item(f).vocabulary[0].example.origin='source';},/must be "generated"/);
 invalid(f=>{delete item(f).study.translations.en;},/missing required field "en"/);
 const a=projectNorskDailyFeed(fixture).articles[0],[prov,headline,generated,vocab,grammar]=a.page.blocks;
 assert.equal(headline.type,'bilingual');assert.equal(headline.no,item(fixture).headline.text);assert.equal(headline.en,item(fixture).study.translations.en.text);assert.match(headline.hint,/NO: source wording.*EN: generated translation, not source wording/);
 assert.equal(generated.title,'Generated study text (not source wording)');assert(generated.children.some(b=>b.text===item(fixture).study.paraphrase.text&&/generated/.test(b.title)));
 assert.match(prov.title,/SYNTHETIC FIXTURE/);assert.equal(prov.tone,'warning');assert.match(prov.text,/Everything else on this page is generated study text/);
 assert.equal(vocab.title,'Vocabulary (generated)');assert.equal(a.page.title,item(fixture).headline.text);assert.equal(a.page.article.publisher,'SYNTHETIC-FIXTURE');
 assert.deepEqual(a.page.resourceLinks,[{label:'V2 word order in main clauses',target:{kind:'page',pageId:'page.samples.norsk.sentences'}}]);assert.equal(grammar.children[0].target.pageId,'page.samples.norsk.sentences');
 assert(a.page.tags.includes('synthetic-fixture'));assert.deepEqual(a.taxonomy,{subject:'norsk'});assert.deepEqual(a.page.article.taxonomy,{subject:'norsk'});
 assert.match(a.page.sources[0].note,/article body is not mirrored/);
});

test('V3 Norsk nb/nn language codes are preserved and French is optional',()=>{
 invalid(f=>{item(f).language='no';},/language must be one of nb, nn/);
 invalid(f=>{item(f).language='se';},/language/);
 const p=projectNorskDailyFeed(fixture),[a1,a2]=p.articles;
 assert(a1.page.tags.includes('lang:nb'));assert(a2.page.tags.includes('lang:nn'));assert.match(a2.page.blocks[1].hint,/source wording \(nn\)/);assert.match(a2.page.blocks[0].text,/Nynorsk \(nn\)/);
 assert(a1.page.blocks[2].children.some(b=>b.id.endsWith('.french')));assert(a1.page.blocks[3].children[0].columns.includes('French'));
 assert(!a2.page.blocks[2].children.some(b=>b.id.endsWith('.french')));assert(!a2.page.blocks[3].children[0].columns.includes('French'));
 const noFrench=feed();delete item(noFrench).study.translations.fr;for(const v of item(noFrench).vocabulary)delete v.fr;assert.doesNotThrow(()=>validateNorskDailyFeed(noFrench));
 assert(!projectNorskDailyFeed(noFrench).articles[0].page.blocks[3].children[0].columns.includes('French'));
});

test('V3 Norsk projection is deterministic, reorder-invariant and uses stable feed-derived IDs',()=>{
 const a=projectNorskDailyFeed(fixture),b=projectNorskDailyFeed(feed());assert.equal(stable(a),stable(b));
 const reordered=feed();reordered.items.reverse();for(const i of reordered.items)i.vocabulary=[...i.vocabulary];const c=projectNorskDailyFeed(reordered);assert.equal(stable(c.articles),stable(a.articles));assert.equal(stable(c.qcm),stable(a.qcm));
 assert.deepEqual(a.articles.map(x=>x.pageId),['norsk-daily.item.synthetic-fixture-0001','norsk-daily.item.synthetic-fixture-0002','norsk-daily.item.synthetic-fixture-0003']);
 assert.equal(a.qcm.pageId,'norsk-daily.qcm.synthetic-2026-09-24');assert.equal(a.qcm.page.qcm.questions.length,2);
 for(const x of a.articles){assert.equal(x.page.id,x.page.article.id);for(const b of x.page.blocks)assert(b.id.startsWith(x.pageId+'.'));}
 // Revision bump with an unchanged question keeps its ID; a changed question gets a new one.
 const bumped=feed();item(bumped).revision=2;item(bumped).headline.text+=' i dag';assert.equal(questionIdFor(item(bumped),item(bumped).questions[0]),questionIdFor(item(fixture),item(fixture).questions[0]));
 const changed=correction();assert.notEqual(questionIdFor(item(changed),item(changed).questions[0]),questionIdFor(item(fixture),item(fixture).questions[0]));
 assert.equal(projectNorskDailyFeed(bumped).articles[0].pageId,a.articles[0].pageId,'A correction is a new revision of the same resource ID');
 assert.notEqual(projectNorskDailyFeed(bumped).articles[0].contentHash,a.articles[0].contentHash);
 const q=a.qcm.page.qcm.questions[0];assert.deepEqual(q.links[0].target,{kind:'article',articleId:a.articles[0].pageId,pageId:a.articles[0].pageId});
});

test('V3 Norsk deduplicates by sourceId and rejects inconsistent duplicates',()=>{
 const same=feed();same.items.push(structuredClone(item(fixture)));const p=projectNorskDailyFeed(same);assert.equal(p.articles.length,3);assert.deepEqual(p.duplicates,[{sourceId:'synthetic-0001',itemId:'synthetic-fixture-0001',keptRevision:1,droppedRevisions:[],entries:2}]);
 const newer=feed();const r2=structuredClone(item(fixture));r2.revision=2;r2.headline.text+=' i dag';newer.items.unshift(r2);const q=projectNorskDailyFeed(newer);assert.equal(q.articles[0].revision,2);assert.match(q.articles[0].page.title,/i dag$/);assert.deepEqual(q.duplicates[0].droppedRevisions,[1]);
 invalid(f=>{const d=structuredClone(item(f));d.headline.text+=' endret';f.items.push(d);},/appears twice with different content/);
 invalid(f=>{const d=structuredClone(item(f));d.itemId='synthetic-fixture-0099';f.items.push(d);},/maps to two itemIds/);
 invalid(f=>{const d=structuredClone(item(f,1));d.itemId=item(f).itemId;f.items.push(d);},/already used for another sourceId/);
 const dupPlan=planNorskDailyImport(same,()=>undefined,{createdAt:1});assert.equal(dupPlan.changeSet.operations.length,4);assert.match(dupPlan.messages[0],/1 duplicate source entries collapsed/);
});

test('V3 Norsk import is a reviewed ChangeSet: preview is read-only, staging is not acceptance',async()=>{
 const {api,backend}=await setup(),before=stable(backend.state);
 const {plan,preview}=previewNorskDailyImport(api,fixtureText,opts());assert.equal(stable(backend.state),before);assert.equal(backend.commits,0);
 assert.deepEqual(plan.changeSet.operations.map(o=>[o.kind,o.resourceKey,o.baseRevisionId]),[['resource.create',K.a1,null],['resource.create',K.a2,null],['resource.create',K.a3,null],['resource.create',K.qcm,null]]);
 assert.equal(preview.changes.length,4);assert(plan.changeSet.operations.every(o=>['resource.create','resource.update'].includes(o.kind)));
 await api.stage(plan.changeSet);assert.equal(api.getReviews().items[0].status,'staged');assert.throws(()=>api.getResource(K.a1),/Resource unavailable/,'Staging must not apply content');
 await api.reject(plan.changeSet.id);assert.throws(()=>api.getResource(K.a1),/Resource unavailable/);
 const again=planNorskDailyImport(fixtureText,lookupFromAgent(api),opts());await api.stage(again.changeSet);await api.accept(again.changeSet.id);
 const a=api.getResource(K.a1);assert.equal(a.head.number,1);assert.equal(a.snapshot.page.article.taxonomy.subject,'norsk');assert.equal(a.snapshot.taxonomy.subject,'norsk');
 assert.equal(api.getResource(K.qcm).snapshot.page.qcm.questions.length,2);assert.equal(backend.state.history.revisions.find(r=>r.revisionId===a.head.revisionId).source,'ai');
 assert.equal(api.listResources({subject:'norsk',type:'article'}).items.filter(r=>r.resourceId.startsWith('norsk-daily.')).length,3);
});

test('V3 Norsk revisions: identical no-op, higher updates same ID, lower/conflicting rejected',async()=>{
 const {api,backend}=await setup();await importFeed(api,fixtureText);
 const noop=planNorskDailyImport(fixtureText,lookupFromAgent(api),opts());assert.equal(noop.changeSet,undefined);assert.equal(noop.blocked,false);assert.deepEqual([...noop.items,noop.qcm].map(r=>r.action),['unchanged','unchanged','unchanged','unchanged']);
 // A reader's status on the Article is not feed data and survives the correction.
 await backend.manual(ws=>{const s=api.getResource(K.a1).snapshot;s.page.article.status='reading';s.page.article.important=true;resourceAdapters.article.project(ws.overlays,compose(built,ws),s);});
 const upd=await importFeed(api,correction());assert.deepEqual(upd.items.map(r=>r.action),['update','unchanged','unchanged']);assert.equal(upd.qcm.action,'update');
 assert.deepEqual(upd.changeSet.operations.map(o=>o.kind),['resource.update','resource.update']);
 const a=api.getResource(K.a1);assert.equal(a.resourceId,articlePageId('synthetic-fixture-0001'));assert.match(a.snapshot.page.title,/i to uker$/);assert(a.snapshot.page.tags.includes('norsk-daily-revision:2'));
 assert.equal(a.snapshot.page.article.status,'reading');assert.equal(a.snapshot.page.article.important,true);assert.equal(api.getResource(K.a2).head.number,1);
 const lower=planNorskDailyImport(fixtureText,lookupFromAgent(api),opts());assert.equal(lower.blocked,true);assert.equal(lower.changeSet,undefined);
 assert.match(lower.messages.join('\n'),/Item synthetic-fixture-0001 revision 1 is older than the already imported revision 2\. Lower revisions are rejected/);assert.match(lower.messages.join('\n'),/Batch synthetic-2026-09-24 revision 1 is older/);
 const conflict=correction();item(conflict).study.paraphrase.text='En annen omskrivning.';const c=planNorskDailyImport(conflict,lookupFromAgent(api),opts());assert.equal(c.blocked,true);assert.match(c.messages[0],/already imported with different content\. Publish the correction as revision 3/);
 const collision=planNorskDailyImport(fixture,key=>key===K.a1?{head:{revisionId:'x'},snapshot:{page:{...api.getResource(K.a1).snapshot.page,tags:[]}}}:undefined,{createdAt:1});assert.equal(collision.blocked,true);assert.match(collision.messages[0],/not created by Norsk Daily import/);
});

test('V3 Norsk import never touches personal QCM progress; changed questions are never regraded',async()=>{
 const {api,backend}=await setup();await importFeed(api,fixtureText);
 const doc=()=>api.getResource(K.qcm).snapshot.page.qcm,[q1,q2]=doc().questions;
 await backend.personal(p=>{answerQuestion(p,doc(),q1.id,['a'],'',false,1);answerQuestion(p,doc(),q2.id,['nn'],'reflection kept',false,2);p.bookmarks.push({id:'bookmark.norsk',pageId:articlePageId('synthetic-fixture-0002'),title:'Kept',createdAt:3});});
 const personal=stable(backend.state.personal),attempts=structuredClone(backend.state.personal.qcmAttempts);assert.equal(attempts.length,2);
 const p=await importFeed(api,correction());assert(p.changeSet.operations.every(o=>o.kind.startsWith('resource.')));
 assert.equal(stable(backend.state.personal),personal);assert.deepEqual(backend.state.personal.qcmAttempts,attempts);
 const next=doc();assert(!next.questions.some(q=>q.id===q1.id),'Changed question receives a new ID');assert(next.questions.some(q=>q.id===q2.id),'Unchanged question keeps its ID');
 assert.deepEqual(qcmProgress(backend.state.personal,next),{total:2,answered:1,correct:1,review:0});
 const mixed=planNorskDailyImport(correction(),lookupFromAgent(api),opts());assert.equal(mixed.changeSet,undefined);
});

test('V3 Norsk grammar links must resolve to existing pages at review time',async()=>{
 const {api}=await setup(),f=feed();item(f).grammar[0].pageId='page.norsk.missing';
 const {changeSet}=planNorskDailyImport(f,lookupFromAgent(api),opts());assert.throws(()=>api.preview(changeSet),/Source is unavailable/);
});

test('V3 Norsk prompt and JSON Schema are generated from the installed contract',()=>{
 const schema=norskDailyJsonSchema(),prompt=buildTransformationPrompt();
 assert.equal(schema.$id,'atlas.norsk-daily@2');assert.equal(schema.properties.items.maxItems,L.items);assert.equal(schema.properties.items.items.properties.headline.properties.text.maxLength,L.headlineChars);
 assert.deepEqual(schema.properties.review.properties.status,{const:'proposal'});assert.deepEqual(schema.properties.items.items.properties.language,{enum:['nb','nn']});
 assert.match(prompt,/JSON only/);assert.match(prompt,/omit French unless requested/);assert.match(buildTransformationPrompt({includeFrench:true}),/French translation \(requested\)/);assert.match(prompt,/Never claim all or complete headlines/);
 assert(prompt.includes(JSON.stringify(schema)));
});
