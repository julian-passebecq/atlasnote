import test from 'node:test';import assert from 'node:assert/strict';
import {validatePersonal} from '../src/storage/personal-validation.mjs';
import {blankWorkspace} from '../dist-offline/app/core/workspace.js';
import {migratePersonal} from '../dist-offline/app/core/workspace-slots.js';
import * as content from '../dist-offline/app/content-hub/content.js';
import {dashboardCards} from '../dist-offline/app/content-hub/dashboard.js';
import * as planning from '../dist-offline/app/content-hub/planning.js';
import * as contract from './mongoku-projection-contract.mjs';

// Synthetic values only. None of these strings is a real credential.
const FAKE={github:'ghp_'+'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8',jwt:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LW9ubHkifQ.c2lnbmF0dXJlLXRlc3Q',mongo:'mongodb+srv://atlasuser:NotARealPass42@cluster0.example.mongodb.net/db',
 // Header line only, assembled at runtime so the repository secret scan keeps its strict private-key rule.
 pemHeader:['-----BEGIN','RSA','PRIVATE','KEY-----'].join(' ')};
const DAY='2026-09-25',NOW=Date.parse('2026-09-25T09:00:00Z');
function personal(){const ws=blankWorkspace();return migratePersonal(ws.personal);}
function task(id,text,due,extra={}){return {id,kind:'task',text,status:'open',createdAt:1000,...(due?{dueAt:Date.parse(due+'T12:00:00Z')}:{}),...extra};}
function handoff(items,extra={}){return JSON.stringify({schema:'powerops.atlasnote-handoff/1',sourceApp:'powerops',generatedAt:'2026-09-25T08:00:00Z',exportId:'export-1',items,...extra});}
function importNow(p,source,replace=new Set(),now=NOW){const plan=planning.planHandoff(p,source,now);return {plan,receipt:planning.applyHandoff(p,source,plan.fingerprint,replace,now)};}

test('planning view buckets reuse captures and never schedule undated tasks',()=>{
 const p=personal();p.dashboardItems=[task('t.over','Overdue report','2026-09-20'),task('t.today','Call bank',DAY,{important:true}),task('t.soon','Renew cert','2026-10-01'),task('t.later','Plan Q4','2026-11-30'),task('t.none','Someday idea'),task('t.done','Old','2026-09-24',{status:'done'}),task('t.arch','Archived','2026-09-25',{status:'archived'}),{id:'n.1',kind:'note',text:'Title line\nbody',status:'inbox',createdAt:5}];
 p.readLater=[{id:'l.1',title:'Unread',note:'',category:'personal',createdAt:1,target:{kind:'url',url:'https://example.com/a'},read:false},{id:'l.2',title:'Read',note:'',category:'personal',createdAt:2,target:{kind:'url',url:'https://example.com/b'},read:true}];
 const v=planning.planningView(p,DAY);
 assert.deepEqual(v.tasks.map(t=>[t.item.id,t.bucket]),[['t.over','overdue'],['t.today','today'],['t.soon','soon'],['t.later','later'],['t.none','unscheduled']]);
 assert.deepEqual(v.agenda.map(d=>d.date),['2026-09-20',DAY,'2026-10-01','2026-11-30'],'only dated tasks reach the agenda');
 assert.deepEqual(v.done.map(i=>i.id),['t.done']);assert.deepEqual(v.notes.map(i=>i.id),['n.1']);assert.deepEqual(v.reading.map(r=>r.id),['l.1']);
 assert.equal(planning.bucketFor('2026-10-02',DAY),'soon');assert.equal(planning.bucketFor('2026-10-03',DAY),'later');
 assert.deepEqual(planning.planningView(p,DAY,id=>id!=='t.today').tasks.map(t=>t.item.id).includes('t.today'),false,'scope filter applies');
 const card=dashboardCards({pages:[],projects:[],documents:[],packs:[]},{personal:p,overlays:{taxonomy:{},pages:{},archived:[],projects:[]}}).find(c=>c.id==='n.1');
 assert.equal(card.title,'Title line');assert.equal(card.note,'body');
});

test('secret guard flags credential values but not identifiers, vault labels or templates',()=>{
 for(const bad of [FAKE.github,'password: Hunter2-Example','CLOUDFLARE_API_TOKEN=abcdef1234567890',FAKE.jwt,FAKE.mongo,FAKE.pemHeader,'Client secret value: 9f8e7d6c5b4a','AWS AKIA'+'ABCDEFGHIJKLMNOP'])
  assert.ok(planning.detectSecrets(bad).length,'must flag: '+bad.slice(0,12));
 for(const ok of ['Account ID: 0123456789abcdef0123456789abcdef','Zone ID = fedcba9876543210fedcba9876543210','Service Token Client ID: 1234abcd.access','API token - vault label: cf-api-token','Password: stored in Power Ops vault','Client secret ID value: 3f2a1b0c-aaaa-bbbb','CLOUDFLARE_API_TOKEN','Reset password flow review','Token: see Power Ops','https://dash.cloudflare.com/'])
  assert.deepEqual(planning.detectSecrets(ok),[],'must not flag: '+ok);
 for(const t of planning.SERVICE_TEMPLATES){const note=planning.serviceReferenceNote(t.id,'AtlasNote');assert.deepEqual(planning.detectSecrets(note),[],t.id+' template is secret-free');assert.ok(note.length<20000);assert.match(note,/vault label/);}
 const cf=planning.serviceReferenceNote('cloudflare');for(const id of ['Account ID','Zone ID','Access Application ID','Service Token Client ID'])assert.ok(cf.includes(id),id);
 const p=personal();
 assert.throws(()=>content.captureRows(p,'note',[{text:'db '+FAKE.mongo}]),/does not store secret values/);
 content.captureRows(p,'note',[{text:planning.serviceReferenceNote('mongodb-atlas')}]);assert.equal(p.dashboardItems.length,1);
 assert.throws(()=>content.updateCapture(p,p.dashboardItems[0].id,{text:'token='+FAKE.github}),/does not store secret values/);
 content.updateCapture(p,p.dashboardItems[0].id,{status:'done'});
});

test('Power Ops handoff: preview, create, deduplicated re-import, update and retained source',()=>{
 const items=[{sourceObjectId:'po:cap:1',sourceRevision:'1',kind:'task',title:'Renew Access token',dueDate:'2026-09-26',important:true,projectRef:'atlasnote',category:'cloud'},{sourceObjectId:'po:cap:2',kind:'note',title:'Idea',text:'Split planning tabs'},{sourceObjectId:'po:cap:3',kind:'link',title:'CF docs',url:'https://developers.cloudflare.com/'},{sourceObjectId:'po:cap:4',kind:'read-later',title:'Long read',url:'https://example.com/article',text:'why'}];
 const source=handoff(items),before=source,p=personal();
 const preview=planning.planHandoff(p,source,NOW);assert.deepEqual(preview.counts,{create:4,update:0,unchanged:0,conflict:0,skip:0,refuse:0});assert.equal(p.dashboardItems,undefined,'preview is pure');
 const {receipt}=importNow(p,source);
 assert.equal(receipt.schema,'atlasnote.import-receipt/1');assert.deepEqual(receipt.items.map(i=>i.status),['created','created','created','created']);
 assert.equal(p.dashboardItems.length,3);assert.equal(p.readLater.length,1);validatePersonal(p);
 const t=p.dashboardItems.find(i=>i.origin.objectId==='po:cap:1');assert.equal(t.kind,'task');assert.equal(planning.dueDateOf(t),'2026-09-26');assert.deepEqual(t.taxonomy,{subject:'cloud'});assert.equal(t.origin.app,'powerops');assert.equal(t.origin.revision,'1');assert.equal(t.origin.projectRef,'atlasnote');
 assert.equal(p.readLater[0].target.url,'https://example.com/article');assert.equal(p.readLater[0].origin.objectId,'po:cap:4');
 // Same handoff again: no duplicates and no writes.
 const again=planning.planHandoff(p,source,NOW+1000);assert.deepEqual(again.counts,{create:0,update:0,unchanged:4,conflict:0,skip:0,refuse:0});
 const snapshot=JSON.stringify(p);importNow(p,source,new Set(),NOW+1000);assert.equal(JSON.stringify(p),snapshot,'unchanged re-import writes nothing');
 // Source changed upstream: predictable update in place.
 const changed=handoff([{...items[0],sourceRevision:'2',title:'Renew Access token (rotated)',dueDate:'2026-09-30'}]);
 const r2=importNow(p,changed,new Set(),NOW+2000);assert.equal(r2.plan.rows[0].action,'update');assert.equal(p.dashboardItems.length,3);
 const t2=p.dashboardItems.find(i=>i.origin.objectId==='po:cap:1');assert.equal(t2.text,'Renew Access token (rotated)');assert.equal(t2.id,t.id);assert.equal(t2.origin.revision,'2');assert.equal(planning.dueDateOf(t2),'2026-09-30');
 assert.equal(source,before,'the Power Ops payload is never mutated');validatePersonal(p);
});

test('Power Ops handoff: local edits are kept unless explicitly replaced',()=>{
 const p=personal(),first=handoff([{sourceObjectId:'po:9',sourceRevision:'1',kind:'task',title:'Check backups'}]);importNow(p,first);
 const id=p.dashboardItems[0].id;content.updateCapture(p,id,{status:'done'},NOW+10);
 assert.equal(planning.planHandoff(p,first,NOW+20).rows[0].action,'skip','same revision keeps AtlasNote edits');
 const next=handoff([{sourceObjectId:'po:9',sourceRevision:'2',kind:'task',title:'Check backups weekly'}]);
 const r=importNow(p,next,new Set(),NOW+30);assert.equal(r.plan.rows[0].action,'conflict');assert.equal(r.receipt.items[0].status,'kept-local');assert.equal(p.dashboardItems[0].text,'Check backups');
 const r2=importNow(p,next,new Set(['po:9']),NOW+40);assert.equal(r2.receipt.items[0].status,'updated');assert.equal(p.dashboardItems[0].text,'Check backups weekly');assert.equal(p.dashboardItems[0].status,'open');
 content.updateCapture(p,id,{status:'archived'},NOW+50);assert.equal(planning.planHandoff(p,handoff([{sourceObjectId:'po:9',sourceRevision:'3',kind:'task',title:'x'}]),NOW+60).rows[0].action,'skip');
 assert.equal(planning.planHandoff(p,handoff([{sourceObjectId:'po:9',kind:'note',title:'x'}]),NOW+60).rows[0].action,'refuse','kind change is refused');
});

test('Power Ops handoff refuses secrets, bad envelopes and stale previews',()=>{
 const p=personal();
 const plan=planning.planHandoff(p,handoff([
  {sourceObjectId:'s1',kind:'note',title:'Cloudflare',password:'Hunter2-Example'},
  {sourceObjectId:'s2',kind:'note',title:'nested',meta:{clientSecret:'abc123456789'}},
  {sourceObjectId:'s3',kind:'note',title:'text',text:'token: '+FAKE.github},
  {sourceObjectId:'s4',kind:'link',url:'https://example.com/?access_token=abc123'},
  {sourceObjectId:'s5',kind:'link',url:'https://user:pw@example.com/'},
  {sourceObjectId:'s6',kind:'task',title:'ok',credentialRef:'vault:cf-api',apiToken:''},
  {sourceObjectId:'s6',kind:'task',title:'dup'},
  {kind:'note',title:'no id'},
  {sourceObjectId:'s7',kind:'calendar',title:'bad kind'},
  {sourceObjectId:'s8',kind:'task',title:'bad date',dueDate:'2026-02-30'},
  {sourceObjectId:'s9',kind:'read-later',title:'no url'},
 ]),NOW);
 assert.deepEqual(plan.rows.map(r=>r.action),['refuse','refuse','refuse','refuse','refuse','create','refuse','refuse','refuse','refuse','refuse']);
 assert.match(plan.rows[0].reason,/secret-looking field/);assert.match(plan.rows[1].reason,/meta\.clientSecret/);assert.match(plan.rows[3].reason,/secret-looking parameter/);
 assert.ok(plan.rows[5].warnings.some(w=>/credentialRef/.test(w)),'opaque credentialRef is ignored with a warning');assert.ok(plan.rows[5].warnings.some(w=>/Empty secret-looking field "apiToken"/.test(w)));
 const {receipt}=importNow(p,handoff([{sourceObjectId:'s1',kind:'note',title:'Cloudflare',password:'Hunter2-Example'},{sourceObjectId:'s6',kind:'task',title:'ok',credentialRef:'vault:cf-api'}]));
 assert.deepEqual(receipt.items.map(i=>i.status),['refused','created']);const stored=JSON.stringify(p);assert.ok(!stored.includes('Hunter2')&&!stored.includes('vault:cf-api'),'no secret or credential reference is stored');
 assert.throws(()=>planning.planHandoff(p,'{"schema":"other/1","items":[]}'),/Unsupported handoff/);
 assert.throws(()=>planning.planHandoff(p,'not json'),/not valid JSON/);
 assert.throws(()=>planning.planHandoff(p,handoff([],{sourceApp:'mongoku'})),/sourceApp/);
 assert.throws(()=>planning.planHandoff(p,handoff([],{apiToken:'abcdef123456'})),/secret-looking fields/);
 assert.throws(()=>planning.planHandoff(p,handoff(Array.from({length:201},(_,i)=>({sourceObjectId:'x'+i,kind:'note',title:'n'})))),/at most 200/);
 const src=handoff([{sourceObjectId:'z1',kind:'note',title:'fresh'}]),stale=planning.planHandoff(p,src,NOW);importNow(p,src);
 assert.throws(()=>planning.applyHandoff(p,src,stale.fingerprint,new Set(),NOW),/changed since the preview/);
 validatePersonal(p);
});

test('planning overview is a bounded, deterministic, timestamped galaxy projection that Mongoku accepts',()=>{
 const p=personal();p.dashboardItems=[task('t.a','Private task title\nprivate details','2026-09-24'),task('t.b','Second',DAY),task('t.c','Third'),{id:'n.secretish',kind:'note',text:'My private journal entry',status:'inbox',createdAt:9}];
 for(let i=0;i<60;i++)p.dashboardItems.push(task('bulk.'+String(i).padStart(2,'0'),'Bulk '+i,'2026-12-0'+(1+i%9)));
 p.readLater=[{id:'l.1',title:'Queue',note:'secret thoughts',category:'personal',createdAt:1,target:{kind:'url',url:'https://example.com/q'},read:false}];
 const opts={generatedAt:'2026-09-25T09:00:00Z',today:DAY};
 const a=planning.canonicalJSON(planning.planningOverview(p,opts)),b=planning.canonicalJSON(planning.planningOverview(structuredClone(p),opts));
 assert.equal(a,b,'same state, same bytes');const o=JSON.parse(a);
 const parsed=contract.parseProjection(o);assert.equal(parsed.ok,true,JSON.stringify(parsed.issues));
 assert.deepEqual(Object.keys(o).sort(),['authority','counts','format','freshness','generatedAt','items','lifecycle','projectRef','sourceApp','sourceObjectId','sourceRevision','visibility'],'only contract fields');
 assert.equal(o.format,'atlasnote.planning-overview/1');assert.equal(o.projectRef,'atlasnote');assert.equal(o.sourceApp,'atlasnote');assert.equal(o.sourceObjectId,'atlasnote.planning-overview');
 assert.equal(o.generatedAt,opts.generatedAt);assert.equal(o.authority,'atlasnote');assert.equal(o.visibility,'private');assert.equal(o.freshness,'snapshot');assert.equal(o.lifecycle,'current');
 assert.equal(o.items.length,25);assert.ok(Object.keys(o.counts).length<=30);assert.ok(Object.values(o.counts).every(n=>Number.isInteger(n)&&n>=0));
 assert.equal(o.counts.open_tasks,63);assert.equal(o.counts.overdue_tasks,1);assert.equal(o.counts.due_today_tasks,1);assert.equal(o.counts.unscheduled_tasks,1);assert.equal(o.counts.notes,1);assert.equal(o.counts.reading_queue,1);assert.equal(o.counts.listed_tasks,25);assert.equal(o.counts.workspaces,1);
 assert.deepEqual(o.items[0],{dueAt:'2026-09-24',id:'t.a',kind:'task',status:'overdue',title:'Private task title'});assert.equal(o.items[1].status,'due-today');
 for(const item of o.items)for(const v of Object.values(item))assert.ok(v.length<=500);
 for(const hidden of ['private details','My private journal entry','secret thoughts','https://example.com/q'])assert.ok(!a.includes(hidden),'excluded: '+hidden);
 assert.ok(new TextEncoder().encode(a).length<16*1024,'small');
 const later=planning.planningOverview(p,{...opts,generatedAt:'2026-09-25T10:00:00Z'});assert.equal(later.sourceRevision,o.sourceRevision,'revision tracks state, not the clock');
 p.dashboardItems[1].status='done';assert.notEqual(planning.planningOverview(p,opts).sourceRevision,o.sourceRevision);
 const bare=planning.planningOverview(p,{...opts,includeTitles:false}),bareText=planning.canonicalJSON(bare);assert.equal(contract.parseProjection(bare).ok,true);
 assert.ok(!bareText.includes('Private task title'));assert.equal(bare.items[0].title,'Open task due 2026-09-24');assert.equal(bare.sourceRevision,planning.planningOverview(p,opts).sourceRevision,'title option does not change the snapshot identity');
 assert.throws(()=>planning.planningOverview(p,{...opts,generatedAt:'soon'}),/generatedAt/);
});

test('planning overview withholds secret-like titles and fails closed on anything else',()=>{
 const p=personal();p.dashboardItems=[task('t.1','api key: rotate',DAY),task('t.2','Password = later',DAY),task('t.3','token: rotate'),task('t.4','ship '+FAKE.github),task('t.5','Rotate Cloudflare Access service token','2026-09-26'),task('t.6','DB_HOST=x\nDB_USER=y')];
 const opts={generatedAt:'2026-09-25T09:00:00Z',today:DAY},o=planning.planningOverview(p,opts),text=planning.canonicalJSON(o);
 assert.equal(contract.parseProjection(JSON.parse(text)).ok,true,'Mongoku accepts the export');
 assert.deepEqual(o.items.map(i=>i.title),['Open task due '+DAY+' (title withheld)','Open task due '+DAY+' (title withheld)','Rotate Cloudflare Access service token','Open task (title withheld)','Open task (title withheld)','DB_HOST=x']);
 assert.equal(o.counts.withheld_titles,4);for(const hidden of ['api key','Password','token:',FAKE.github.slice(0,12)])assert.ok(!text.includes(hidden),'withheld: '+hidden);
 // The oracle itself refuses such titles, which is why they are withheld.
 const raw={...JSON.parse(text),items:[{id:'x',title:'token: rotate'}]};assert.equal(contract.parseProjection(raw).reason,'secret_like');
 assert.equal(contract.parseProjection({...JSON.parse(text),password:'x'}).reason,'secret_like');assert.equal(contract.parseProjection({...JSON.parse(text),credentialRef:'vault:x',api_key_present:true}).ok,true,'descriptor names pass');
 // Anything the title rule cannot repair (here an item ID) stops the export instead of producing a payload Mongoku would refuse.
 p.dashboardItems.push(task('token=abcdef123456','x'));assert.throws(()=>planning.planningOverview(p,opts),/withheld: secret-like content at items\[\d+\]\.id/);
});

test('planning overview openUri keeps only a credential-free http(s) app location',()=>{
 const p=personal(),opts={generatedAt:'2026-09-25T09:00:00Z',today:DAY};
 const o=planning.planningOverview(p,{...opts,openUri:'https://user:pw@atlas.example.com/app/?workspace=2#dashboard'});assert.equal(o.openUri,undefined);
 const ok=planning.planningOverview(p,{...opts,openUri:'https://atlas.example.com/app/index.html?x=1#dashboard'});assert.equal(ok.openUri,'https://atlas.example.com/app/index.html');assert.equal(contract.parseProjection(ok).ok,true);
 for(const href of ['file:///D:/atlas/index.html','javascript:alert(1)','not a url'])assert.equal(planning.planningOverview(p,{...opts,openUri:href}).openUri,undefined,href);
 assert.equal(ok.sourceRevision,planning.planningOverview(p,opts).sourceRevision,'location does not change the snapshot identity');
 assert.deepEqual(ok.items,[]);assert.equal(ok.counts.open_tasks,0);
});

test('real Power Ops (JUtility) handoff shape imports after preview and is not duplicated on re-import',async()=>{
 const fs=await import('node:fs/promises'),source=await fs.readFile('docs/galaxy/examples/powerops-jutility-handoff.sample.json','utf8'),before=source,p=personal();
 const preview=planning.planHandoff(p,source,NOW);
 assert.deepEqual(preview.counts,{create:5,update:0,unchanged:0,conflict:0,skip:1,refuse:0});assert.deepEqual(preview.warnings,[]);assert.ok(preview.rows.every(r=>!r.warnings.length),JSON.stringify(preview.rows.map(r=>r.warnings)));
 assert.equal(preview.rows[5].reason,'Archived in Power Ops; not imported.');assert.equal(p.dashboardItems,undefined,'preview is pure');
 const {receipt}=importNow(p,source);assert.deepEqual(receipt.items.map(i=>i.status),['created','created','created','created','created','skipped']);validatePersonal(p);
 const env=JSON.parse(source),t=p.dashboardItems.find(i=>i.origin.objectId===env.items[0].sourceObjectId);
 assert.equal(t.kind,'task');assert.equal(t.status,'open');assert.equal(t.important,true,'priority High marks it important');assert.deepEqual(t.taxonomy,{subject:'cloud'});
 assert.equal(planning.dueDateOf(t),planning.localDateKey(new Date(env.items[0].dueUtc)),'dueUtc is read as the local calendar day Power Ops picked');
 assert.equal(t.origin.app,'powerops');assert.equal(t.origin.revision,env.items[0].sourceRevision);assert.equal(t.origin.projectRef,env.items[0].projectRef);assert.equal(t.createdAt,Date.parse(env.items[0].createdUtc));
 assert.equal(p.dashboardItems.find(i=>i.origin.objectId===env.items[4].sourceObjectId).kind,'note','inbox captures arrive as notes');
 assert.equal(p.readLater.length,1);assert.equal(p.readLater[0].origin.objectId,env.items[3].sourceObjectId);assert.equal(p.dashboardItems.length,4);
 const again=planning.planHandoff(p,source,NOW+1000);assert.deepEqual(again.counts,{create:0,update:0,unchanged:5,conflict:0,skip:1,refuse:0});
 const snapshot=JSON.stringify(p);importNow(p,source,new Set(),NOW+1000);assert.equal(JSON.stringify(p),snapshot,'re-import writes nothing and duplicates nothing');
 const done=structuredClone(env);done.items[0].isCompleted=true;done.items[0].sourceRevision='2026-09-25T09:00:00.0000000+00:00';
 const r=importNow(p,JSON.stringify(done),new Set(),NOW+2000);assert.equal(r.plan.rows[0].action,'update');assert.equal(p.dashboardItems.find(i=>i.id===t.id).status,'done');assert.equal(p.dashboardItems.length,4);
 assert.equal(source,before,'the Power Ops payload is never mutated');
 const declared=structuredClone(env);declared.containsCredentialValues=true;assert.throws(()=>planning.planHandoff(p,JSON.stringify(declared)),/secret-looking fields \(containsCredentialValues\)/);
 const v2=structuredClone(env);v2.version=2;assert.throws(()=>planning.planHandoff(p,JSON.stringify(v2)),/Unsupported handoff/);
});

test('documented sample handoff previews cleanly',async()=>{
 const fs=await import('node:fs/promises'),source=await fs.readFile('docs/galaxy/examples/powerops-atlasnote-handoff.sample.json','utf8');
 const plan=planning.planHandoff(personal(),source,NOW);assert.deepEqual(plan.counts,{create:4,update:0,unchanged:0,conflict:0,skip:0,refuse:0});assert.deepEqual(plan.warnings,[]);assert.ok(plan.rows.every(r=>!r.warnings.length));
});

test('quick reschedule reuses dueAt and can return a task to Unscheduled',()=>{
 const p=personal();p.dashboardItems=[task('t.1','Pay invoice'),{id:'n.1',kind:'note',text:'note',status:'inbox',createdAt:1}];
 planning.rescheduleTask(p,'t.1','2026-09-26',NOW);assert.equal(planning.dueDateOf(p.dashboardItems[0]),'2026-09-26');assert.equal(p.dashboardItems[0].updatedAt,NOW);
 assert.equal(planning.planningView(p,DAY).tasks[0].bucket,'soon');
 planning.rescheduleTask(p,'t.1',null,NOW+1);assert.equal(p.dashboardItems[0].dueAt,undefined);assert.equal(planning.planningView(p,DAY).tasks[0].bucket,'unscheduled');
 assert.throws(()=>planning.rescheduleTask(p,'n.1','2026-09-26'),/unavailable/);assert.throws(()=>planning.rescheduleTask(p,'t.1','2026-02-30'),/valid calendar date/);validatePersonal(p);
});
