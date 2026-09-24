/** AtlasNote Norsk Daily feed contract (atlas.norsk-daily@2).
 *
 * The feed is inert, bounded JSON produced by an EXPLICIT user transformation
 * (for example ChatGPT used by the user outside AtlasNote) from permitted or
 * user-supplied headline metadata. Validation never strips, coerces or fetches.
 * A valid feed is still only a proposal: it becomes content only through the
 * existing Agent Review preview -> stage -> explicit human accept path.
 */
import {ID,stable} from '../core/validation.mjs';

export const NORSK_DAILY_SCHEMA='atlas.norsk-daily';
export const NORSK_DAILY_SCHEMA_VERSION=2;
export const NORSK_DAILY_KIND='atlas-norsk-daily-batch';
export const NORSK_DAILY_PROMPT_ID='atlas.norsk-daily.prompt@2';
export const NORSK_DAILY_TIMEZONE='Europe/Oslo';
export const NORSK_DAILY_LIMITS=Object.freeze({
 bytes:256*1024,items:40,sectionChars:60,publisherChars:120,noteChars:500,statementChars:400,toolChars:80,
 headlineChars:200,paraphraseChars:600,translationChars:600,uncertainty:5,uncertaintyChars:300,
 vocabulary:8,lemmaChars:60,glossChars:120,exampleChars:240,grammar:4,grammarLabelChars:120,grammarNoteChars:300,
 questions:3,promptChars:300,options:5,optionChars:160,explanationChars:600,hosts:8,subscribedSources:20,sourceIdChars:160,urlChars:2048,
 revision:10000
});
export const COVERAGE_KINDS=Object.freeze(['partial-snapshot','user-selection','complete-subscribed-sources']);
export const PERMISSION_STATUSES=Object.freeze(['synthetic-fixture','user-supplied-private-study','permission-unverified']);
export const TRANSFORM_METHODS=Object.freeze(['explicit-user-chatgpt','manual-authoring','synthetic-fixture']);
export const LANGUAGES=Object.freeze(['nb','nn']);
export const LEVELS=Object.freeze(['A2','B1','B2','C1']);
export const PARTS_OF_SPEECH=Object.freeze(['noun','verb','adjective','adverb','pronoun','preposition','conjunction','determiner','numeral','interjection','phrase']);

/** Stable slugs: 3-64 lowercase ASCII, used to derive AtlasNote resource IDs. */
export const SLUG=/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const SOURCE_ID=/^[A-Za-z0-9][A-Za-z0-9._:\/-]{0,159}$/;
const QUESTION_ID=/^[a-z0-9][a-z0-9-]{0,23}$/;
const OPTION_ID=/^[a-z0-9][a-z0-9-]{0,11}$/;
const RESERVED_KEYS=new Set(['__proto__','prototype','constructor']);
/** Personal state is never publication data. A clearer error than "unknown field". */
const PERSONAL_KEYS=new Set(['qcmAttempts','qcmResponses','attempts','attempt','progress','personal','bookmarks','readLater','reflection','reflections','answeredAt','selectedOptionIds','dashboardItems','session','workspaceSlots']);
/** A claim of exhaustive coverage needs the explicit complete-coverage evidence. */
const COMPLETE_CLAIM=/\b(?:all|every)\s+(?:of\s+)?(?:the\s+)?(?:(?:day'?s|today'?s|daily)\s+)?(?:nrk\s+)?(?:headlines?|stories|news|articles)\b|\b(?:complete|full|exhaustive|comprehensive)\s+(?:daily\s+)?(?:coverage|collection|feed)\b|\balle\s+(?:dagens\s+)?(?:nrk-?\s*)?(?:overskrift\w*|nyhet\w*|saker|artikler)\b|\btous\s+les\s+(?:titres|articles)\b|\btoutes\s+les\s+(?:actualit\w*|nouvelles|infos)\b/i;

export class NorskDailyValidationError extends Error{constructor(message){super('Invalid Norsk Daily feed: '+message);this.name='NorskDailyValidationError';}}
const fail=m=>{throw new NorskDailyValidationError(m);};
const plainObject=(v,path)=>{if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail(path+' must be a plain JSON object');};
function keys(v,allowed,required,path){plainObject(v,path);for(const k of Object.keys(v))if(!allowed.includes(k))fail(path+': unknown field "'+k+'"');for(const k of required)if(!Object.hasOwn(v,k))fail(path+': missing required field "'+k+'"');}
function array(v,path,max,min=0){if(!Array.isArray(v))fail(path+' must be an array');if(v.length<min||v.length>max)fail(path+' must contain '+min+'-'+max+' entries');}
function choice(v,values,path){if(!values.includes(v))fail(path+' must be one of '+values.join(', '));}
function integer(v,path,min,max){if(!Number.isSafeInteger(v)||v<min||v>max)fail(path+' must be an integer '+min+'-'+max);}
function pattern(v,re,path,hint){if(typeof v!=='string'||!re.test(v))fail(path+' must be '+hint);}

/** Inert single-language study text. Rejects markup, links, templates and control characters. */
export function checkText(v,path,max,{min=1,multiline=false}={}){
 if(typeof v!=='string')fail(path+' must be text');
 if(v.trim().length<min)fail(path+' is required');
 if(v.length>max)fail(path+' exceeds '+max+' characters');
 if(v!==v.normalize('NFC'))fail(path+' must be Unicode NFC');
 if(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/.test(v)||!multiline&&v.includes('\n'))fail(path+' contains control characters');
 if(/[‪-‮⁦-⁩​﻿]/.test(v))fail(path+' contains invisible/bidirectional override characters');
 if(/[<>`]/.test(v))fail(path+' must not contain markup (<, >, backtick)');
 if(/\]\(|!\[|\{\{|\$\{|<%|%>/.test(v))fail(path+' must not contain links, images or template syntax');
 if(/\b(?:https?|ftp|javascript|data|vbscript|file|blob):|\bwww\./i.test(v))fail(path+' must not contain URLs; use item.sourceUrl metadata');
 return v;
}
const DATE=/^(\d{4})-(\d{2})-(\d{2})$/;
export function parseStudyDate(v,path='studyDate'){
 const m=typeof v==='string'&&DATE.exec(v);if(!m)fail(path+' must be YYYY-MM-DD');
 const [y,mo,d]=[+m[1],+m[2],+m[3]];if(y<2000||y>2100)fail(path+' year out of range');
 const t=Date.UTC(y,mo-1,d);if(new Date(t).toISOString().slice(0,10)!==v)fail(path+' is not a calendar date');return {y,mo,d};
}
const TIMESTAMP=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|([+-])(\d{2}):(\d{2}))$/;
/** RFC 3339 with an explicit offset. A date-time annotation alone is not validation. */
export function parseTimestamp(v,path){
 const m=typeof v==='string'&&TIMESTAMP.exec(v);if(!m)fail(path+' must be an RFC 3339 timestamp with an explicit offset');
 parseStudyDate(m[1]+'-'+m[2]+'-'+m[3],path);const [h,mi,s]=[+m[4],+m[5],+m[6]];if(h>23||mi>59||s>59)fail(path+' has an invalid clock time');
 let offset=0;if(m[8]!=='Z'){const oh=+m[10],om=+m[11];if(oh>14||om>59)fail(path+' has an invalid UTC offset');offset=(m[9]==='-'?-1:1)*(oh*60+om)*60000;}
 return Date.UTC(+m[1],+m[2]-1,+m[3],h,mi,s,m[7]?+m[7].padEnd(3,'0'):0)-offset;
}

let osloFormat;
function osloParts(ms){
 try{osloFormat??=new Intl.DateTimeFormat('en-GB',{timeZone:NORSK_DAILY_TIMEZONE,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});}
 catch{fail('Europe/Oslo time-zone data is unavailable; the study day cannot be validated');}
 const p=Object.fromEntries(osloFormat.formatToParts(new Date(ms)).filter(x=>x.type!=='literal').map(x=>[x.type,+x.value]));
 return {y:p.year,mo:p.month,d:p.day,h:p.hour,mi:p.minute,s:p.second};
}
const osloOffset=ms=>{const p=osloParts(ms),whole=Math.floor(ms/1000)*1000;return Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi,p.s)-whole;};
function osloMidnight(y,mo,d){
 const local=Date.UTC(y,mo-1,d);let t=local-osloOffset(local-3600000);const corrected=local-osloOffset(t);if(corrected!==t)t=corrected;
 const p=osloParts(t);if(p.y!==new Date(local).getUTCFullYear()||p.mo!==new Date(local).getUTCMonth()+1||p.d!==new Date(local).getUTCDate()||p.h||p.mi||p.s)fail('Could not resolve Europe/Oslo midnight');return t;
}
/** Half-open local day [00:00, next 00:00) in Europe/Oslo, including DST 23/25-hour days. */
export function osloDayInterval(date){const {y,mo,d}=parseStudyDate(date);return {start:osloMidnight(y,mo,d),end:osloMidnight(y,mo,d+1)};}
export function osloDateOf(ms){const p=osloParts(ms);return String(p.y).padStart(4,'0')+'-'+String(p.mo).padStart(2,'0')+'-'+String(p.d).padStart(2,'0');}

const RESERVED_HOST=/(?:^|\.)(?:invalid|example|test|localhost)$|^example\.(?:com|net|org)$|\.example\.(?:com|net|org)$/;
function hostname(v,path){
 if(typeof v!=='string'||v.length>253||!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(v))fail(path+' must be a lowercase DNS host name');
 if(v==='localhost'||v.endsWith('.localhost')||v.endsWith('.local')||v.endsWith('.internal'))fail(path+' must not be a local host');return v;
}
const hostAllowed=(host,hosts)=>hosts.some(h=>host===h||host.endsWith('.'+h));
/** Metadata only. AtlasNote never fetches this URL during import. */
export function checkSourceUrl(v,path,hosts,synthetic){
 if(typeof v!=='string'||v.length>NORSK_DAILY_LIMITS.urlChars)fail(path+' must be a bounded URL string');
 if(/[\u0000- \u007f\\]/.test(v))fail(path+' contains spaces or control characters');
 let u;try{u=new URL(v);}catch{fail(path+' must be an absolute http(s) URL');}
 if(!['https:','http:'].includes(u.protocol))fail(path+' must use https or http');
 if(u.username||u.password)fail(path+' must not contain credentials');
 if(u.port)fail(path+' must not use an explicit port');
 if(/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':')||u.hostname.startsWith('['))fail(path+' must use a DNS host name, not an IP address');
 if(u.href!==v)fail(path+' must be in canonical form ('+u.href+')');
 if(!hosts.length||!hostAllowed(u.hostname,hosts))fail(path+' host '+u.hostname+' is not declared in source.hosts');
 if(synthetic&&!RESERVED_HOST.test(u.hostname))fail(path+': a synthetic fixture may only use reserved example/.invalid hosts');
 if(/(?:^|[?&])(?:token|key|sig|signature|auth|session|password|access_token)=/i.test(u.search))fail(path+' must not carry credentials or tokens in its query');
 return v;
}

function scanKeys(v,path='feed',depth=0){
 if(depth>12)fail('nesting is too deep');
 if(Array.isArray(v)){v.forEach((x,i)=>scanKeys(x,path+'['+i+']',depth+1));return;}
 if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){if(RESERVED_KEYS.has(k))fail('reserved key "'+k+'" at '+path);if(PERSONAL_KEYS.has(k))fail('personal progress ("'+k+'" at '+path+') must be absent from publication data');scanKeys(x,path+'.'+k,depth+1);}return;}
 if(typeof v==='number'&&!Number.isFinite(v))fail('non-finite number at '+path);
 if(!['string','number','boolean'].includes(typeof v)&&v!==null)fail('non-JSON value at '+path);
}
function generated(v,path,max){keys(v,['text','origin'],['text','origin'],path);if(v.origin!=='generated')fail(path+'.origin must be "generated": study text is never presented as source wording');checkText(v.text,path+'.text',max);}
function claimGuard(text,path,coverage){if(coverage!=='complete-subscribed-sources'&&COMPLETE_CLAIM.test(text))fail(path+' claims complete/all-headline coverage, but coverage.kind is '+coverage+'. Only complete-subscribed-sources with completeEvidence may make that claim.');}

function validateCoverage(c,feed,interval,itemCount){
 keys(c,['kind','statement','completeEvidence'],['kind','statement'],'coverage');choice(c.kind,COVERAGE_KINDS,'coverage.kind');checkText(c.statement,'coverage.statement',NORSK_DAILY_LIMITS.statementChars);
 if(c.kind!=='complete-subscribed-sources'){if(c.completeEvidence!==undefined)fail('coverage.completeEvidence is only valid for complete-subscribed-sources');return;}
 if(feed.source.permission.status==='synthetic-fixture')fail('a synthetic fixture cannot claim complete coverage');
 const e=c.completeEvidence;if(e===undefined)fail('coverage.kind complete-subscribed-sources requires coverage.completeEvidence');
 keys(e,['method','subscribedSources','checkedAt','observedItemCount'],['method','subscribedSources','checkedAt','observedItemCount'],'coverage.completeEvidence');
 if(e.method!=='enumerated-subscribed-sources')fail('coverage.completeEvidence.method must be enumerated-subscribed-sources');
 array(e.subscribedSources,'coverage.completeEvidence.subscribedSources',NORSK_DAILY_LIMITS.subscribedSources,1);e.subscribedSources.forEach((s,i)=>pattern(s,SLUG,'coverage.completeEvidence.subscribedSources['+i+']','a publisher slug'));
 if(new Set(e.subscribedSources).size!==e.subscribedSources.length)fail('coverage.completeEvidence.subscribedSources must be unique');
 if(!e.subscribedSources.includes(feed.source.publisherId))fail('coverage.completeEvidence must list source.publisherId');
 const day=osloDayInterval(feed.studyDate);if(interval.start!==day.start||interval.end!==day.end)fail('complete coverage requires collectionInterval to span the whole Europe/Oslo study day; a snapshot of a rolling feed is partial-snapshot');
 if(parseTimestamp(e.checkedAt,'coverage.completeEvidence.checkedAt')<interval.end)fail('complete coverage can only be checked after the collection interval ends');
 integer(e.observedItemCount,'coverage.completeEvidence.observedItemCount',0,NORSK_DAILY_LIMITS.items);if(e.observedItemCount!==itemCount)fail('coverage.completeEvidence.observedItemCount ('+e.observedItemCount+') does not match the '+itemCount+' distinct items supplied');
}

function validateItem(item,path,feed,interval,synthetic){
 keys(item,['itemId','revision','sourceId','sourceUrl','sourcePublishedAt','observedAt','section','language','difficulty','headline','study','vocabulary','grammar','questions'],['itemId','revision','sourceId','sourcePublishedAt','observedAt','language','difficulty','headline','study','vocabulary'],path);
 pattern(item.itemId,SLUG,path+'.itemId','a stable 3-64 character lowercase slug');integer(item.revision,path+'.revision',1,NORSK_DAILY_LIMITS.revision);
 pattern(item.sourceId,SOURCE_ID,path+'.sourceId','the publisher\'s canonical source ID (no spaces, max 160)');
 if(item.sourceUrl!==undefined&&item.sourceUrl!==null)checkSourceUrl(item.sourceUrl,path+'.sourceUrl',feed.source.hosts??[],synthetic);
 const observed=parseTimestamp(item.observedAt,path+'.observedAt');if(observed<interval.start||observed>interval.end)fail(path+'.observedAt must lie within collectionInterval');
 if(item.sourcePublishedAt!==null){const published=parseTimestamp(item.sourcePublishedAt,path+'.sourcePublishedAt');if(published>observed)fail(path+'.sourcePublishedAt cannot be after observedAt (unknown publication time must stay null)');}
 if(item.section!==undefined)checkText(item.section,path+'.section',NORSK_DAILY_LIMITS.sectionChars);
 choice(item.language,LANGUAGES,path+'.language');choice(item.difficulty,LEVELS,path+'.difficulty');
 keys(item.headline,['text','origin'],['text','origin'],path+'.headline');if(item.headline.origin!=='source')fail(path+'.headline.origin must be "source": the headline is kept exactly as supplied');checkText(item.headline.text,path+'.headline.text',NORSK_DAILY_LIMITS.headlineChars);
 const s=item.study;keys(s,['paraphrase','translations','uncertainty'],['paraphrase','translations'],path+'.study');generated(s.paraphrase,path+'.study.paraphrase',NORSK_DAILY_LIMITS.paraphraseChars);
 keys(s.translations,['en','fr'],['en'],path+'.study.translations');generated(s.translations.en,path+'.study.translations.en',NORSK_DAILY_LIMITS.translationChars);if(s.translations.fr!==undefined)generated(s.translations.fr,path+'.study.translations.fr',NORSK_DAILY_LIMITS.translationChars);
 if(s.uncertainty!==undefined){array(s.uncertainty,path+'.study.uncertainty',NORSK_DAILY_LIMITS.uncertainty);s.uncertainty.forEach((u,i)=>checkText(u,path+'.study.uncertainty['+i+']',NORSK_DAILY_LIMITS.uncertaintyChars));}
 array(item.vocabulary,path+'.vocabulary',NORSK_DAILY_LIMITS.vocabulary,1);const lemmas=new Set();
 item.vocabulary.forEach((v,i)=>{const p=path+'.vocabulary['+i+']';keys(v,['lemma','form','partOfSpeech','en','fr','example'],['lemma','partOfSpeech','en'],p);checkText(v.lemma,p+'.lemma',NORSK_DAILY_LIMITS.lemmaChars);if(v.form!==undefined)checkText(v.form,p+'.form',NORSK_DAILY_LIMITS.lemmaChars);choice(v.partOfSpeech,PARTS_OF_SPEECH,p+'.partOfSpeech');checkText(v.en,p+'.en',NORSK_DAILY_LIMITS.glossChars);if(v.fr!==undefined)checkText(v.fr,p+'.fr',NORSK_DAILY_LIMITS.glossChars);if(v.example!==undefined)generated(v.example,p+'.example',NORSK_DAILY_LIMITS.exampleChars);const key=v.lemma.toLowerCase()+'/'+v.partOfSpeech;if(lemmas.has(key))fail(p+' duplicates lemma '+v.lemma);lemmas.add(key);});
 if(item.grammar!==undefined){array(item.grammar,path+'.grammar',NORSK_DAILY_LIMITS.grammar);const pages=new Set();item.grammar.forEach((g,i)=>{const p=path+'.grammar['+i+']';keys(g,['pageId','label','note'],['pageId','label'],p);pattern(g.pageId,ID,p+'.pageId','an existing AtlasNote Norsk page ID');if(pages.has(g.pageId))fail(p+' duplicates grammar page '+g.pageId);pages.add(g.pageId);checkText(g.label,p+'.label',NORSK_DAILY_LIMITS.grammarLabelChars);if(g.note!==undefined)generated(g.note,p+'.note',NORSK_DAILY_LIMITS.grammarNoteChars);});}
 if(item.questions!==undefined){array(item.questions,path+'.questions',NORSK_DAILY_LIMITS.questions);const qids=new Set();item.questions.forEach((q,i)=>{const p=path+'.questions['+i+']';keys(q,['questionId','origin','prompt','options','correctOptionIds','explanation'],['questionId','origin','prompt','options','correctOptionIds'],p);pattern(q.questionId,QUESTION_ID,p+'.questionId','a 1-24 character lowercase ID');if(qids.has(q.questionId))fail(p+' duplicates questionId '+q.questionId);qids.add(q.questionId);if(q.origin!=='generated')fail(p+'.origin must be "generated"');checkText(q.prompt,p+'.prompt',NORSK_DAILY_LIMITS.promptChars);
  array(q.options,p+'.options',NORSK_DAILY_LIMITS.options,2);const oids=new Set();q.options.forEach((o,j)=>{keys(o,['optionId','text'],['optionId','text'],p+'.options['+j+']');pattern(o.optionId,OPTION_ID,p+'.options['+j+'].optionId','a 1-12 character lowercase ID');if(oids.has(o.optionId))fail(p+' duplicates optionId '+o.optionId);oids.add(o.optionId);checkText(o.text,p+'.options['+j+'].text',NORSK_DAILY_LIMITS.optionChars);});
  array(q.correctOptionIds,p+'.correctOptionIds',q.options.length,1);if(new Set(q.correctOptionIds).size!==q.correctOptionIds.length||q.correctOptionIds.some(id=>!oids.has(id)))fail(p+'.correctOptionIds must be unique existing option IDs');if(q.explanation!==undefined)checkText(q.explanation,p+'.explanation',NORSK_DAILY_LIMITS.explanationChars);});}
}

/** Strict semantic validation. Returns a detached copy; the input is never modified. */
export function validateNorskDailyFeed(input,{now}={}){
 scanKeys(input);plainObject(input,'feed');
 if(new TextEncoder().encode(JSON.stringify(input)).length>NORSK_DAILY_LIMITS.bytes)fail('feed exceeds '+NORSK_DAILY_LIMITS.bytes+' bytes');
 if(input.schemaVersion===1||input.feedId==='norsk.daily')fail('the atlas.norsk-daily@1 draft is not importable. Re-run the transformation with the installed atlas.norsk-daily@2 contract');
 if(Number.isSafeInteger(input.schemaVersion)&&input.schemaVersion>NORSK_DAILY_SCHEMA_VERSION)fail('schemaVersion '+input.schemaVersion+' is a future major version and is not supported by this AtlasNote build');
 const f=input;keys(f,['schema','schemaVersion','kind','feedId','batchId','batchRevision','studyDate','timezone','collectionInterval','generatedAt','source','coverage','transform','review','items'],['schema','schemaVersion','kind','feedId','batchId','batchRevision','studyDate','timezone','collectionInterval','generatedAt','source','coverage','transform','review','items'],'feed');
 if(f.schema!==NORSK_DAILY_SCHEMA||f.schemaVersion!==NORSK_DAILY_SCHEMA_VERSION||f.kind!==NORSK_DAILY_KIND)fail('expected schema '+NORSK_DAILY_SCHEMA+' version '+NORSK_DAILY_SCHEMA_VERSION+' kind '+NORSK_DAILY_KIND);
 pattern(f.feedId,SLUG,'feedId','a stable lowercase slug');pattern(f.batchId,SLUG,'batchId','a stable lowercase slug');integer(f.batchRevision,'batchRevision',1,NORSK_DAILY_LIMITS.revision);
 parseStudyDate(f.studyDate);if(f.timezone!==NORSK_DAILY_TIMEZONE)fail('timezone must be Europe/Oslo');
 const day=osloDayInterval(f.studyDate);keys(f.collectionInterval,['start','end'],['start','end'],'collectionInterval');
 const interval={start:parseTimestamp(f.collectionInterval.start,'collectionInterval.start'),end:parseTimestamp(f.collectionInterval.end,'collectionInterval.end')};
 if(interval.start>=interval.end)fail('collectionInterval.start must precede end');
 if(interval.start<day.start||interval.end>day.end)fail('collectionInterval must lie within the Europe/Oslo study day '+f.studyDate+' (half-open local midnight to midnight)');
 const generatedAt=parseTimestamp(f.generatedAt,'generatedAt');if(generatedAt<interval.end)fail('generatedAt cannot precede the end of collection');
 if(now!==undefined&&generatedAt>now+10*60000)fail('generatedAt is in the future');
 keys(f.source,['publisher','publisherId','permission','hosts'],['publisher','publisherId','permission'],'source');checkText(f.source.publisher,'source.publisher',NORSK_DAILY_LIMITS.publisherChars);pattern(f.source.publisherId,SLUG,'source.publisherId','a stable lowercase slug');
 keys(f.source.permission,['status','note'],['status','note'],'source.permission');choice(f.source.permission.status,PERMISSION_STATUSES,'source.permission.status');checkText(f.source.permission.note,'source.permission.note',NORSK_DAILY_LIMITS.noteChars);
 const synthetic=f.source.permission.status==='synthetic-fixture';
 if(synthetic&&(!/SYNTHETIC/.test(f.source.publisher)||!f.source.publisherId.includes('synthetic')))fail('a synthetic fixture must be visibly labelled SYNTHETIC in source.publisher and source.publisherId');
 if(f.source.hosts!==undefined){array(f.source.hosts,'source.hosts',NORSK_DAILY_LIMITS.hosts,1);f.source.hosts.forEach((h,i)=>{hostname(h,'source.hosts['+i+']');if(synthetic&&!RESERVED_HOST.test(h))fail('source.hosts['+i+']: a synthetic fixture may only declare reserved example/.invalid hosts');});if(new Set(f.source.hosts).size!==f.source.hosts.length)fail('source.hosts must be unique');}
 keys(f.transform,['method','promptId','tool'],['method','promptId'],'transform');choice(f.transform.method,TRANSFORM_METHODS,'transform.method');if(f.transform.promptId!==NORSK_DAILY_PROMPT_ID)fail('transform.promptId must be '+NORSK_DAILY_PROMPT_ID);if(f.transform.tool!==undefined)checkText(f.transform.tool,'transform.tool',NORSK_DAILY_LIMITS.toolChars);
 if((f.transform.method==='synthetic-fixture')!==synthetic)fail('transform.method synthetic-fixture and source.permission.status synthetic-fixture must be used together');
 keys(f.review,['status'],['status'],'review');if(f.review.status!=='proposal')fail('review.status must be "proposal". A feed cannot declare itself reviewed or approved; acceptance happens only in AtlasNote Agent Review');
 array(f.items,'items',NORSK_DAILY_LIMITS.items,1);
 f.items.forEach((item,i)=>validateItem(item,'items['+i+']',f,interval,synthetic));
 // Identity: one logical story per publisher source ID. Repeated entries are
 // allowed (rolling feeds repeat stories) but must be consistent.
 const bySource=new Map(),byItem=new Map();
 f.items.forEach((item,i)=>{
  if(byItem.has(item.itemId)&&byItem.get(item.itemId)!==item.sourceId)fail('items['+i+']: itemId '+item.itemId+' is already used for another sourceId');byItem.set(item.itemId,item.sourceId);
  const prior=bySource.get(item.sourceId);if(prior){if(prior.itemId!==item.itemId)fail('items['+i+']: sourceId '+item.sourceId+' maps to two itemIds ('+prior.itemId+', '+item.itemId+')');const same=f.items.filter(x=>x.sourceId===item.sourceId&&x.revision===item.revision);if(same.some(x=>stable(x)!==stable(item)))fail('items['+i+']: sourceId '+item.sourceId+' revision '+item.revision+' appears twice with different content. Corrections need a higher revision.');}
  else bySource.set(item.sourceId,item);
 });
 validateCoverage(f.coverage,f,interval,bySource.size);
 for(const [text,path] of [[f.coverage.statement,'coverage.statement'],[f.source.permission.note,'source.permission.note'],[f.transform.tool??'','transform.tool']])claimGuard(text,path,f.coverage.kind);
 return structuredClone(f);
}
/** JSON-only entry point for user-selected files/pasted text. */
export function parseNorskDailyJSON(source,options){
 if(typeof source!=='string')fail('expected JSON text');
 if(new TextEncoder().encode(source).length>NORSK_DAILY_LIMITS.bytes)fail('feed exceeds '+NORSK_DAILY_LIMITS.bytes+' bytes');
 let value;try{value=JSON.parse(source.replace(/^﻿/,''));}catch{fail('malformed JSON (JSON only; no comments, scripts or templates)');}
 return validateNorskDailyFeed(value,options);
}
/** Deterministic 64-bit FNV-1a over canonical JSON; identity/change detection, not security. */
export function contentHash(value){let n=0xcbf29ce484222325n;for(const code of new TextEncoder().encode(stable(value)))n=BigInt.asUintN(64,(n^BigInt(code))*0x100000001b3n);return n.toString(16).padStart(16,'0');}
