import type {Personal} from '../core/model.js';
import type {ReadingItem} from '../core/reading-types.js';
import type {DashboardItem,ExternalOrigin,SubjectKey} from './model.js';
import {SUBJECT_COMPAT} from './model.js';
import {validateHubPersonal} from './validation.mjs';
import {validateReadingLists,normaliseReadingUrl,READING_LIMITS} from '../storage/reading-validation.mjs';
import {fingerprint} from '../references/targets.js';
import {detectSecrets} from './secrets.js';
import {splitCaptureText} from './dashboard.js';
export {detectSecrets,secretMessage,assertNoSecrets} from './secrets.js';
export type {SecretFinding} from './secrets.js';

/* Planning views, the reviewed Power Ops intake and the bounded planning overview.
 * Everything here is a projection of the existing Dashboard captures and Read later
 * list: no second task model, no scheduler and no live synchronisation. */

// ---------------------------------------------------------------- dates
export const DUE_SOON_DAYS=7;
const DATE=/^\d{4}-\d{2}-\d{2}$/;
/** Local calendar day of the viewer; task due dates are stored as noon UTC of a calendar date. */
export function localDateKey(d=new Date()):string{return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
export function addDays(day:string,n:number):string{return new Date(Date.parse(day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function dueDateOf(item:Pick<DashboardItem,'dueAt'>):string|undefined{return item.dueAt===undefined?undefined:new Date(item.dueAt).toISOString().slice(0,10);}
export function dueAtFromDate(day:string):number{
 if(!DATE.test(day))throw Error('Use a YYYY-MM-DD date.');const at=Date.parse(day+'T12:00:00Z');
 if(!Number.isFinite(at)||new Date(at).toISOString().slice(0,10)!==day)throw Error('Use a valid calendar date.');return at;
}

// ---------------------------------------------------------------- planning view
export type PlanningBucket='overdue'|'today'|'soon'|'later'|'unscheduled';
export const PLANNING_BUCKETS:{id:PlanningBucket;label:string}[]=[{id:'overdue',label:'Overdue'},{id:'today',label:'Today'},{id:'soon',label:'Due soon'},{id:'later',label:'Later'},{id:'unscheduled',label:'Unscheduled'}];
export type PlanningTask={item:DashboardItem;dueDate?:string;bucket:PlanningBucket};
export type PlanningView={today:string;soonUntil:string;tasks:PlanningTask[];done:DashboardItem[];notes:DashboardItem[];links:DashboardItem[];reading:ReadingItem[];agenda:{date:string;tasks:PlanningTask[]}[]};
export function bucketFor(dueDate:string|undefined,today:string):PlanningBucket{
 if(!dueDate)return 'unscheduled';if(dueDate<today)return 'overdue';if(dueDate===today)return 'today';return dueDate<=addDays(today,DUE_SOON_DAYS)?'soon':'later';
}
const byDue=(a:PlanningTask,b:PlanningTask)=>(a.dueDate??'9999-99-99').localeCompare(b.dueDate??'9999-99-99')||Number(!!b.item.important)-Number(!!a.item.important)||a.item.createdAt-b.item.createdAt||a.item.id.localeCompare(b.item.id);
/** Open tasks by due bucket. Tasks without a date stay unscheduled; only dated tasks reach the agenda. */
export function planningView(p:Pick<Personal,'dashboardItems'|'readLater'>,today:string,include:(id:string)=>boolean=()=>true):PlanningView{
 if(!DATE.test(today))throw Error('Planning needs a YYYY-MM-DD day.');
 const items=(p.dashboardItems??[]).filter(i=>i.status!=='archived'&&include(i.id));
 const tasks=items.filter(i=>i.kind==='task'&&i.status!=='done').map(item=>{const dueDate=dueDateOf(item);return {item,...(dueDate?{dueDate}:{}),bucket:bucketFor(dueDate,today)};}).sort(byDue);
 const agenda:{date:string;tasks:PlanningTask[]}[]=[];for(const t of tasks){if(!t.dueDate)continue;const last=agenda.at(-1);if(last?.date===t.dueDate)last.tasks.push(t);else agenda.push({date:t.dueDate,tasks:[t]});}
 const recent=(a:DashboardItem,b:DashboardItem)=>(b.updatedAt??b.createdAt)-(a.updatedAt??a.createdAt)||a.id.localeCompare(b.id);
 return {today,soonUntil:addDays(today,DUE_SOON_DAYS),tasks,agenda,
  done:items.filter(i=>i.kind==='task'&&i.status==='done').sort(recent),
  notes:items.filter(i=>i.kind==='note'&&i.status!=='done').sort(recent),
  links:items.filter(i=>i.kind==='link'&&i.status!=='done').sort(recent),
  reading:(p.readLater??[]).filter(r=>!r.read&&include('later.'+r.id)).sort((a,b)=>b.createdAt-a.createdAt||a.id.localeCompare(b.id))};
}

// ---------------------------------------------------------------- service reference templates
export type ServiceField={name:string;what:string;where:string;usedBy?:string};
export type ServiceTemplate={id:string;label:string;identifiers:ServiceField[];secrets:{name:string;where:string}[];env:string[];links:string[];pitfalls:string[]};
export const SERVICE_TEMPLATES:ServiceTemplate[]=[
 {id:'cloudflare',label:'Cloudflare',identifiers:[
  {name:'Account ID',what:'Identifies the Cloudflare account (32 hex characters).',where:'Dashboard > account home > Account ID menu, or any domain Overview > API panel.',usedBy:'Wrangler account_id, API paths /accounts/{account_id}/...'},
  {name:'Zone ID',what:'Identifies one domain (zone). Same 32-hex shape as the Account ID: check which page you copied it from.',where:'Domain > Overview > API panel.',usedBy:'API paths /zones/{zone_id}/..., DNS and cache rules.'},
  {name:'Zero Trust team domain',what:'<team>.cloudflareaccess.com; issuer of Access JWTs.',where:'Zero Trust > Settings > Custom pages / Team domain.',usedBy:'JWT issuer and /cdn-cgi/access/certs.'},
  {name:'Access Application ID',what:'UUID of one Access application.',where:'Zero Trust > Access > Applications > application > Overview.',usedBy:'API /access/apps/{app_id}.'},
  {name:'Access Application AUD tag',what:'Audience tag; this is not the Application ID.',where:'Zero Trust > Access > Applications > application > Overview.',usedBy:'Validating the aud claim of Cf-Access-Jwt-Assertion.'},
  {name:'Service Token Client ID',what:'Public half of an Access service token (ends with .access).',where:'Zero Trust > Access > Service auth > Service Tokens.',usedBy:'Request header CF-Access-Client-Id.'},
  {name:'Worker / Pages project name',what:'Deployment name in this account.',where:'Workers & Pages overview.',usedBy:'wrangler.jsonc name.'}],
  secrets:[{name:'API token',where:'My Profile > API Tokens (value shown once).'},{name:'Service Token Client Secret',where:'Shown once when the service token is created; sent as the Access client-secret request header.'}],
  env:['CLOUDFLARE_ACCOUNT_ID','CF_ACCESS_CLIENT_ID','API token variable used by Wrangler/CI - secret, write its name in your project only','Access client-secret variable - secret, name only'],
  links:['https://dash.cloudflare.com/','https://one.dash.cloudflare.com/','https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/','https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/'],
  pitfalls:['Account ID and Zone ID look identical; label them where you copy them.','AUD tag is not the Application ID.','A service token secret is shown once: put it in the Power Ops vault immediately.','API tokens are scoped to accounts/zones; note the scope, never the value.']},
 {id:'mongodb-atlas',label:'MongoDB Atlas',identifiers:[
  {name:'Organization ID',what:'24-hex ID of the Atlas organization.',where:'Organization > Settings.'},
  {name:'Project ID',what:'24-hex ID of the Atlas project; the Admin API calls it groupId.',where:'Project > Project Settings.',usedBy:'Admin API /groups/{groupId}/...'},
  {name:'Cluster name',what:'Clusters are addressed by name in the API, not by an ID.',where:'Database > Clusters.'},
  {name:'Cluster host',what:'e.g. cluster0.xxxxx.mongodb.net (no credentials).',where:'Cluster > Connect > Drivers.'},
  {name:'Database name',what:'Logical database used by the application.',where:'Data Explorer.'},
  {name:'Database user name',what:'User for drivers; its password is a secret.',where:'Security > Database Access.'},
  {name:'API public key / service account client ID',what:'Public half of Admin API credentials.',where:'Organization > Access Manager > Applications.'}],
  secrets:[{name:'Database user password',where:'Set in Database Access; never inside a URI saved here.'},{name:'Full connection string with credentials',where:'Build it from the vault at runtime.'},{name:'API private key / client secret',where:'Shown once at creation.'}],
  env:['MONGODB_URI - secret (contains credentials), name only','MONGODB_DB'],
  links:['https://cloud.mongodb.com/','https://www.mongodb.com/docs/atlas/'],
  pitfalls:['Project ID = groupId in the Admin API.','Network Access (IP list) blocks connections before authentication.','URL-encode special characters of a password in a URI.']},
 {id:'azure',label:'Microsoft Azure / Entra ID',identifiers:[
  {name:'Tenant ID',what:'Directory GUID.',where:'Entra ID > Overview.'},
  {name:'Subscription ID',what:'Billing/resource scope GUID.',where:'Subscriptions.'},
  {name:'Resource group',what:'Name of the resource group.',where:'Resource groups.'},
  {name:'Application (client) ID',what:'GUID of an app registration.',where:'App registrations > Overview.'},
  {name:'Object ID',what:'Different GUID from the client ID; used for role assignments.',where:'Enterprise applications / App registrations.'},
  {name:'Client secret ID',what:'Identifier of a secret; it is not the secret value.',where:'App registrations > Certificates & secrets.'}],
  secrets:[{name:'Client secret value',where:'Visible once after creation.'}],
  env:['AZURE_TENANT_ID','AZURE_SUBSCRIPTION_ID','AZURE_CLIENT_ID','AZURE_CLIENT_SECRET - secret, name only'],
  links:['https://portal.azure.com/','https://entra.microsoft.com/'],
  pitfalls:['Client ID and Object ID are different GUIDs.','The "Secret ID" column is not the secret value.']},
 {id:'fabric',label:'Microsoft Fabric / Power BI',identifiers:[
  {name:'Workspace ID',what:'GUID after /groups/ in the workspace URL.',where:'Browser address bar.'},
  {name:'Item ID',what:'GUID of a lakehouse, report, semantic model or notebook.',where:'Item URL.'},
  {name:'Capacity',what:'Capacity name/ID backing the workspace.',where:'Workspace settings > License info.'}],
  secrets:[{name:'Service principal secret',where:'See Azure / Entra ID.'}],env:['FABRIC_WORKSPACE_ID'],links:['https://app.fabric.microsoft.com/'],
  pitfalls:['"My workspace" has no shareable workspace ID for automation.']},
 {id:'github',label:'GitHub',identifiers:[
  {name:'Owner / repository',what:'owner/name slug.',where:'Repository URL.'},
  {name:'GitHub App ID and Client ID',what:'Public identifiers of an app.',where:'Settings > Developer settings > GitHub Apps.'},
  {name:'Installation ID',what:'Numeric ID of an app installation.',where:'Installed app URL.'}],
  secrets:[{name:'Personal access token',where:'Settings > Developer settings > Tokens.'},{name:'App private key / client secret',where:'Generated once.'}],
  env:['GITHUB_TOKEN / GH_TOKEN - secret, name only'],links:['https://github.com/settings/tokens','https://github.com/settings/apps'],
  pitfalls:['Fine-grained tokens are per repository: note the scope and expiry, never the value.']},
 {id:'vercel',label:'Vercel',identifiers:[
  {name:'Team ID',what:'team_... identifier.',where:'Team Settings > General.',usedBy:'.vercel/project.json orgId, VERCEL_ORG_ID.'},
  {name:'Project ID',what:'prj_... identifier.',where:'Project Settings > General.',usedBy:'.vercel/project.json projectId, VERCEL_PROJECT_ID.'}],
  secrets:[{name:'Access token',where:'Account Settings > Tokens.'}],env:['VERCEL_ORG_ID','VERCEL_PROJECT_ID','VERCEL_TOKEN - secret, name only'],links:['https://vercel.com/dashboard'],
  pitfalls:['orgId is a team ID for team projects and a user ID for personal ones.']},
 {id:'netlify',label:'Netlify',identifiers:[
  {name:'Site ID (API ID)',what:'UUID of the site.',where:'Site configuration > General > Site details.',usedBy:'NETLIFY_SITE_ID.'},
  {name:'Team slug',what:'Team identifier in URLs.',where:'Team settings.'}],
  secrets:[{name:'Personal access token',where:'User settings > Applications.'}],env:['NETLIFY_SITE_ID','NETLIFY_AUTH_TOKEN - secret, name only'],links:['https://app.netlify.com/'],
  pitfalls:['Site name can change; the Site ID does not.']},
 {id:'databricks',label:'Databricks',identifiers:[
  {name:'Workspace URL',what:'https://adb-<workspace-id>.<n>.azuredatabricks.net or cloud equivalent.',where:'Browser address bar.',usedBy:'DATABRICKS_HOST.'},
  {name:'Workspace ID',what:'Numeric ID (o= parameter).',where:'Workspace URL.'},
  {name:'Cluster ID',what:'Compute cluster identifier.',where:'Compute > cluster > Configuration / JSON.'},
  {name:'SQL warehouse ID',what:'Last segment of the HTTP path /sql/1.0/warehouses/<id>.',where:'SQL Warehouses > Connection details.'}],
  secrets:[{name:'Personal access token',where:'Settings > Developer > Access tokens.'}],env:['DATABRICKS_HOST','DATABRICKS_TOKEN - secret, name only'],links:['https://docs.databricks.com/'],
  pitfalls:['Tokens are per workspace; a URL change means a different token.']},
 {id:'generic',label:'Other service',identifiers:[{name:'Account / tenant ID',what:'',where:''},{name:'Project / resource ID',what:'',where:''}],secrets:[{name:'Token or password',where:''}],env:[],links:[],pitfalls:[]},
];
/** Plain-text knowledge note: meaning and location of identifiers, never secret values. */
export function serviceReferenceNote(templateId:string,project=''):string{
 const t=SERVICE_TEMPLATES.find(x=>x.id===templateId);if(!t)throw Error('Unknown service template.');
 const l=['Service reference - '+t.label+(project.trim()?' - '+project.trim():''),'No secret values in this note. Secrets stay in the Power Ops vault; write only the vault label here.','','IDENTIFIERS (non-secret)'];
 for(const f of t.identifiers){l.push('- '+f.name+' value: ');if(f.what)l.push('  What: '+f.what);if(f.where)l.push('  Where: '+f.where);if(f.usedBy)l.push('  Used by: '+f.usedBy);}
 l.push('','SECRETS (never stored here)');for(const s of t.secrets)l.push('- '+s.name+(s.where?' ('+s.where+')':'')+' - vault label: ');
 if(t.env.length){l.push('','ENVIRONMENT VARIABLE NAMES (names only, no values)');for(const e of t.env)l.push('- '+e);}
 l.push('','LINKS');for(const x of t.links)l.push('- '+x);if(!t.links.length)l.push('- ');
 l.push('','SETUP STEPS','1. ','','PITFALLS');for(const x of t.pitfalls)l.push('- '+x);if(!t.pitfalls.length)l.push('- ');
 return l.join('\n');
}

// ---------------------------------------------------------------- canonical JSON
export function canonicalJSON(value:unknown,indent=2):string{
 const sort=(v:any):any=>Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>[k,sort(v[k])])):v;
 return JSON.stringify(sort(value),null,indent);
}

// ---------------------------------------------------------------- Power Ops handoff intake
export const HANDOFF_SCHEMA='powerops.atlasnote-handoff/1';
export const RECEIPT_SCHEMA='atlasnote.import-receipt/1';
export const HANDOFF_LIMITS=Object.freeze({bytes:1024*1024,items:200});
type HandoffKind='note'|'task'|'link'|'read-later';
const KIND_ALIAS:Record<string,HandoffKind>={note:'note',task:'task',todo:'task','to-do':'task',link:'link',bookmark:'link','read-later':'read-later',readlater:'read-later',read_later:'read-later'};
const ENVELOPE_KEYS=['schema','generatedAt','sourceApp','exportId','items','projectRef','visibility','authority','freshness','observedAt'];
const ITEM_KEYS=['sourceObjectId','sourceRevision','kind','title','text','url','dueDate','status','important','category','projectRef','capturedAt','observedAt','sourceApp','openUri','tags','visibility','authority','freshness'];
const SECRET_TOKENS=new Set(['password','passwd','passphrase','pwd','secret','secrets','token','tokens','apikey','credential','credentials','cookie','cookies','otp','totp','mfa','recovery','bearer','authorization','dotenv','privatekey','pem','seed','mnemonic']);
const SECRET_JOINED=/(api_?key|private_?key|access_?key|session_?key|connection_?string|client_?secret|env_?(values|file|vars?))/;
/** Field names that would carry a credential. Descriptor keys (credentialRef, tokenId, ...) are not values. */
export function isSecretFieldName(key:string):boolean{
 const snake=key.replace(/([a-z0-9])([A-Z])/g,'$1_$2').toLowerCase(),parts=snake.split(/[^a-z0-9]+/).filter(Boolean);
 if(['ref','id','label','name','kind','type','hint'].includes(parts.at(-1)??''))return false;
 return snake==='env'||parts.some(p=>SECRET_TOKENS.has(p))||SECRET_JOINED.test(snake.replace(/_/g,''))||SECRET_JOINED.test(snake);
}
function secretFields(value:unknown,path='',out:string[]=[],depth=0):string[]{
 if(depth>8||!value||typeof value!=='object')return out;
 for(const [k,v] of Object.entries(value as Record<string,unknown>)){const at=path?path+'.'+k:k;if(isSecretFieldName(k)&&v!==undefined&&v!==null&&v!==''&&v!==false)out.push(at);else secretFields(v,at,out,depth+1);}
 return out;
}
const cleanLabel=(v:unknown,max:number)=>typeof v==='string'&&v.trim()&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v)?v.trim():undefined;
export type HandoffAction='create'|'update'|'unchanged'|'conflict'|'skip'|'refuse';
export type HandoffRow={index:number;sourceObjectId?:string;kind?:HandoffKind;title:string;action:HandoffAction;reason?:string;warnings:string[];list?:'dashboard'|'read-later';localId?:string;record?:DashboardItem|ReadingItem;revision?:string;projectRef?:string};
export type HandoffPlan={schema:string;sourceApp:'powerops';exportId?:string;generatedAt?:string;warnings:string[];rows:HandoffRow[];counts:Record<HandoffAction,number>;fingerprint:string};
function parseEnvelope(source:string):{env:Record<string,any>;warnings:string[]}{
 if(typeof source!=='string'||!source.trim())throw Error('Paste or choose a Power Ops handoff JSON file.');
 if(new TextEncoder().encode(source).length>HANDOFF_LIMITS.bytes)throw Error('The handoff exceeds the 1 MiB limit.');
 let env:any;try{env=JSON.parse(source);}catch{throw Error('The handoff is not valid JSON.');}
 if(!env||typeof env!=='object'||Array.isArray(env))throw Error('The handoff must be a JSON object.');
 if(env.schema!==HANDOFF_SCHEMA)throw Error('Unsupported handoff: expected schema "'+HANDOFF_SCHEMA+'".');
 if(env.sourceApp!==undefined&&env.sourceApp!=='powerops')throw Error('This importer only accepts handoffs whose sourceApp is "powerops".');
 const top=Object.keys(env).filter(k=>k!=='items'&&isSecretFieldName(k)&&env[k]!==null&&env[k]!=='');if(top.length)throw Error('Refused: the handoff carries secret-looking fields ('+top.join(', ')+'). Nothing was imported.');
 if(!Array.isArray(env.items))throw Error('The handoff needs an items array.');if(env.items.length>HANDOFF_LIMITS.items)throw Error('Import at most '+HANDOFF_LIMITS.items+' items at once.');
 const warnings=Object.keys(env).filter(k=>!ENVELOPE_KEYS.includes(k)).map(k=>'Unknown envelope field "'+k.slice(0,60)+'" ignored.');
 if(env.visibility==='shareable')warnings.push('Envelope marked shareable; imported items stay private in AtlasNote.');
 return {env,warnings};
}
function controlled(list:'dashboard'|'read-later',r:any){return list==='dashboard'?{kind:r.kind,text:r.text,url:r.url,dueAt:r.dueAt,important:!!r.important,done:r.status==='done'}:{title:r.title,note:r.note,url:r.target?.url};}
function findOrigin(p:Personal,objectId:string):{list:'dashboard'|'read-later';item:DashboardItem|ReadingItem}|undefined{
 const d=p.dashboardItems?.find(i=>i.origin?.app==='powerops'&&i.origin.objectId===objectId);if(d)return {list:'dashboard',item:d};
 const r=p.readLater?.find(i=>i.origin?.app==='powerops'&&i.origin.objectId===objectId);return r?{list:'read-later',item:r}:undefined;
}
function planItem(p:Personal,raw:any,index:number,seen:Set<string>,now:number):HandoffRow{
 const warnings:string[]=[],row=(action:HandoffAction,extra:Partial<HandoffRow>={}):HandoffRow=>({index,title:'Item '+(index+1),action,warnings,...extra});
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return row('refuse',{reason:'Item is not an object.'});
 const objectId=cleanLabel(raw.sourceObjectId,200);if(!objectId)return row('refuse',{reason:'Missing or invalid sourceObjectId.'});
 const base={sourceObjectId:objectId,title:String(cleanLabel(raw.title,200)??objectId).slice(0,200)};
 if(seen.has(objectId))return row('refuse',{...base,reason:'Duplicate sourceObjectId in this handoff.'});seen.add(objectId);
 const secrets=secretFields(raw);if(secrets.length)return row('refuse',{...base,reason:'Refused: secret-looking field(s) '+secrets.slice(0,5).join(', ')+'. AtlasNote does not store credentials.'});
 for(const k of Object.keys(raw))if(!ITEM_KEYS.includes(k))warnings.push('Unknown field "'+k.slice(0,60)+'" ignored.');
 for(const k of Object.keys(raw))if(isSecretFieldName(k))warnings.push('Empty secret-looking field "'+k.slice(0,60)+'" ignored.');
 if(raw.sourceApp!==undefined&&raw.sourceApp!=='powerops')return row('refuse',{...base,reason:'Item sourceApp is not powerops.'});
 const kind=typeof raw.kind==='string'?KIND_ALIAS[raw.kind.toLowerCase()]:undefined;if(!kind)return row('refuse',{...base,reason:'Unsupported kind (use note, task, link or read-later).'});
 const title=typeof raw.title==='string'?raw.title.trim():'',body=typeof raw.text==='string'?raw.text.trim():'';
 if(raw.title!==undefined&&typeof raw.title!=='string'||raw.text!==undefined&&typeof raw.text!=='string')return row('refuse',{...base,kind,reason:'title and text must be strings.'});
 if(title.length>200||body.length>19000)return row('refuse',{...base,kind,reason:'Title (200) or text (19,000) is too long.'});
 const found=detectSecrets(title+'\n'+body);if(found.length)return row('refuse',{...base,kind,reason:'Refused: '+found[0].reason+' in the item text. AtlasNote does not store secret values.'});
 let url:string|undefined;
 if(raw.url!==undefined&&raw.url!==null&&raw.url!==''){
  try{url=normaliseReadingUrl(String(raw.url));}catch(e){return row('refuse',{...base,kind,reason:(e as Error).message});}
  const u=new URL(url);for(const [k,v] of u.searchParams)if(v&&(isSecretFieldName(k)||/^(sig|signature|key|code|access_token|auth)$/i.test(k)))return row('refuse',{...base,kind,reason:'Refused: the URL carries a secret-looking parameter ('+k.slice(0,40)+').'});
  if(detectSecrets(url).length)return row('refuse',{...base,kind,reason:'Refused: the URL looks like it contains a credential.'});
 }
 if((kind==='link'||kind==='read-later')&&!url)return row('refuse',{...base,kind,reason:'A '+kind+' item needs an http(s) url.'});
 if(kind!=='link'&&kind!=='read-later'&&url)warnings.push('url kept as text only for '+kind+' items.');
 let dueAt:number|undefined;
 if(raw.dueDate!==undefined&&raw.dueDate!==null&&raw.dueDate!==''){if(kind!=='task')warnings.push('dueDate ignored: only tasks are scheduled.');else{try{dueAt=dueAtFromDate(String(raw.dueDate));}catch{return row('refuse',{...base,kind,reason:'dueDate must be a valid YYYY-MM-DD date.'});}}}
 if(raw.important!==undefined&&typeof raw.important!=='boolean')warnings.push('important ignored: not a boolean.');
 const status=typeof raw.status==='string'?raw.status.toLowerCase():undefined;if(status!==undefined&&!['open','todo','done','completed','inbox'].includes(status))warnings.push('status "'+String(raw.status).slice(0,30)+'" treated as open.');
 const done=kind==='task'&&(status==='done'||status==='completed');
 const subject=typeof raw.category==='string'&&(['it','cloud','job','kpi','norsk'] as string[]).includes(raw.category.toLowerCase())?raw.category.toLowerCase() as SubjectKey:undefined;
 if(raw.category!==undefined&&!subject)warnings.push('category "'+String(raw.category).slice(0,40)+'" is not an AtlasNote subject; left unclassified.');
 const revision=cleanLabel(raw.sourceRevision,120),projectRef=cleanLabel(raw.projectRef,200);
 if(raw.sourceRevision!==undefined&&!revision)warnings.push('sourceRevision ignored: invalid.');
 const captured=typeof raw.capturedAt==='string'?Date.parse(raw.capturedAt):NaN,createdAt=Number.isFinite(captured)&&captured>0&&captured<=now?captured:now;
 const joined=title&&body?title+'\n\n'+body:title||body;
 const list=kind==='read-later'?'read-later':'dashboard';
 let record:DashboardItem|ReadingItem;
 if(list==='dashboard'){
  const text=(kind==='link'?joined||url!:joined+(url?'\n'+url:'')).trim();if(!text)return row('refuse',{...base,kind,reason:'Item has no title or text.'});
  record={id:'powerops-'+fingerprint(objectId),kind:kind as 'note'|'task'|'link',text,status:kind==='task'?(done?'done':'open'):'inbox',createdAt,...(kind==='link'?{url}:{}),...(dueAt!==undefined?{dueAt}:{}),...(raw.important===true?{important:true}:{}),...(subject?{taxonomy:{subject}}:{})};
 }else{
  const t=(title||url!).slice(0,120);if((title||url!).length>120)warnings.push('Title shortened to 120 characters for Read later.');if(body.length>1000)warnings.push('Text shortened to 1,000 characters for the Read later note.');
  record={id:'powerops-later-'+fingerprint(objectId),title:t,note:body.slice(0,1000),category:subject?SUBJECT_COMPAT[subject]:'personal',createdAt,target:{kind:'url',url:url!},read:false};
 }
 const extra={...base,kind,list,revision,projectRef} as Partial<HandoffRow>;
 const existing=findOrigin(p,objectId);
 if(!existing){
  const clash=list==='dashboard'?p.dashboardItems?.some(i=>i.id===record.id):p.readLater?.some(i=>i.id===record.id);if(clash)return row('refuse',{...extra,reason:'A local item already uses the reserved import ID.'});
  return row('create',{...extra,localId:record.id,record});
 }
 extra.localId=existing.item.id;
 if(existing.list!==list||list==='dashboard'&&(existing.item as DashboardItem).kind!==(record as DashboardItem).kind)return row('refuse',{...extra,reason:'Kind changed since the previous import; the existing AtlasNote item is kept.'});
 const local=existing.item as any,origin=local.origin as ExternalOrigin;
 if(list==='dashboard'&&local.status==='archived')return row('skip',{...extra,reason:'Archived in AtlasNote; left untouched.'});
 const incoming=controlled(list,record),current=controlled(list,local);
 if(fingerprint(incoming)===fingerprint(current))return row('unchanged',{...extra,reason:'Already up to date.'});
 const locallyEdited=origin.fingerprint!==undefined&&origin.fingerprint!==fingerprint(current);
 if(revision!==undefined&&revision===origin.revision)return row('skip',{...extra,reason:'Same source revision; AtlasNote edits are kept.'});
 const merged=list==='dashboard'?{...local,...record,id:local.id,createdAt:local.createdAt,status:(record as DashboardItem).kind==='task'?(record as DashboardItem).status:local.status,...(local.taxonomy?{taxonomy:local.taxonomy}:{}),...(local.contextTarget?{contextTarget:local.contextTarget}:{})}:{...local,title:(record as ReadingItem).title,note:(record as ReadingItem).note,target:(record as ReadingItem).target};
 if(list==='dashboard'&&(record as DashboardItem).dueAt===undefined)delete merged.dueAt;if(list==='dashboard'&&!(record as DashboardItem).important)delete merged.important;
 return row(locallyEdited?'conflict':'update',{...extra,record:merged,...(locallyEdited?{reason:'Edited in AtlasNote since the last import. Kept unless you choose to replace it.'}:{})});
}
/** Reviewed preview. Pure: no state is written. */
export function planHandoff(p:Personal,source:string,now=Date.now()):HandoffPlan{
 const {env,warnings}=parseEnvelope(source),seen=new Set<string>();
 const rows=env.items.map((raw:any,i:number)=>planItem(p,raw,i,seen,now));
 const counts={create:0,update:0,unchanged:0,conflict:0,skip:0,refuse:0} as Record<HandoffAction,number>;for(const r of rows)counts[r.action as HandoffAction]++;
 const exportId=cleanLabel(env.exportId,200),generatedAt=cleanLabel(env.generatedAt,64);
 return {schema:HANDOFF_SCHEMA,sourceApp:'powerops',...(exportId?{exportId}:{}),...(generatedAt?{generatedAt}:{}),warnings,rows,counts,fingerprint:fingerprint(rows.map((r:HandoffRow)=>({i:r.index,a:r.action,id:r.localId,r:r.record&&controlled(r.list!,r.record)})))};
}
export type HandoffReceipt={schema:string;handoffSchema:string;exportId?:string;appliedAt:string;items:{sourceObjectId?:string;status:'created'|'updated'|'unchanged'|'kept-local'|'skipped'|'refused';atlasnoteId?:string;reason?:string}[]};
/** Applies a previewed plan in one personal-state update. Re-plans against the current state
 * and refuses if anything relevant changed since the preview. Never touches the Power Ops source. */
export function applyHandoff(p:Personal,source:string,expectedFingerprint:string,replace:Set<string>=new Set(),now=Date.now()):HandoffReceipt{
 const plan=planHandoff(p,source,now);if(plan.fingerprint!==expectedFingerprint)throw Error('AtlasNote data changed since the preview. Preview the import again.');
 const next=structuredClone(p),items:HandoffReceipt['items']=[];
 for(const r of plan.rows){
  const apply=r.action==='create'||r.action==='update'||r.action==='conflict'&&replace.has(r.sourceObjectId!);
  if(!apply){items.push({...(r.sourceObjectId?{sourceObjectId:r.sourceObjectId}:{}),status:r.action==='unchanged'?'unchanged':r.action==='conflict'?'kept-local':r.action==='skip'?'skipped':'refused',...(r.localId&&r.action!=='refuse'?{atlasnoteId:r.localId}:{}),...(r.reason?{reason:r.reason}:{})});continue;}
  const origin:ExternalOrigin={app:'powerops',objectId:r.sourceObjectId!,importedAt:now,fingerprint:fingerprint(controlled(r.list!,r.record)),...(r.revision?{revision:r.revision}:{}),...(r.projectRef?{projectRef:r.projectRef}:{})};
  if(r.list==='dashboard'){const rec={...(r.record as DashboardItem),origin,...(r.action==='create'?{}:{updatedAt:now})};next.dashboardItems=r.action==='create'?[rec,...(next.dashboardItems??[])]:(next.dashboardItems??[]).map(i=>i.id===rec.id?rec:i);}
  else{const rec={...(r.record as ReadingItem),origin};if(r.action==='create'&&(next.readLater?.length??0)>=READING_LIMITS.items)throw Error('Read later is full. Nothing was imported.');next.readLater=r.action==='create'?[rec,...(next.readLater??[])]:(next.readLater??[]).map(i=>i.id===rec.id?rec:i);}
  items.push({sourceObjectId:r.sourceObjectId,status:r.action==='create'?'created':'updated',atlasnoteId:r.localId});
 }
 validateHubPersonal(next);if(next.readLater)validateReadingLists(next.readLater);
 p.dashboardItems=next.dashboardItems;if(next.readLater)p.readLater=next.readLater;
 return {schema:RECEIPT_SCHEMA,handoffSchema:HANDOFF_SCHEMA,...(plan.exportId?{exportId:plan.exportId}:{}),appliedAt:new Date(now).toISOString(),items};
}

// ---------------------------------------------------------------- planning overview export
export const OVERVIEW_SCHEMA='atlasnote.planning-overview/1';
export const OVERVIEW_MAX_TASKS=50;
export type OverviewOptions={generatedAt:string;today:string;includeTitles?:boolean;maxTasks?:number};
/** Bounded, metadata-only projection for future Mongoku / Power Ops consumption.
 * Deterministic for a given state and options; excludes bodies, notes, annotations, history and credentials. */
export function planningOverview(p:Personal,o:OverviewOptions){
 const view=planningView(p,o.today),max=Math.max(0,Math.min(o.maxTasks??OVERVIEW_MAX_TASKS,OVERVIEW_MAX_TASKS)),includeTitles=o.includeTitles!==false;
 const count=(b:PlanningBucket)=>view.tasks.filter(t=>t.bucket===b).length;
 const fullTasks=view.tasks.slice(0,max).map(t=>({id:t.item.id,status:'open',bucket:t.bucket,title:splitCaptureText(t.item.text).title.slice(0,160),...(t.dueDate?{dueDate:t.dueDate}:{}),...(t.item.important?{important:true}:{}),...(t.item.taxonomy?{subject:t.item.taxonomy.subject}:{}),openTarget:{kind:'dashboard-item',itemId:t.item.id},...(t.item.origin?{origin:{app:t.item.origin.app,objectId:t.item.origin.objectId}}:{})}));
 const openTasks=includeTitles?fullTasks:fullTasks.map(({title,...rest})=>rest);
 const items=(p.dashboardItems??[]).filter(i=>i.status!=='archived');
 const body={schema:OVERVIEW_SCHEMA,sourceApp:'atlasnote',authority:'atlasnote',freshness:'snapshot',visibility:'private',today:o.today,dueSoonDays:DUE_SOON_DAYS,
  counts:{tasks:{open:view.tasks.length,done:view.done.length,overdue:count('overdue'),dueToday:count('today'),dueSoon:count('soon'),later:count('later'),unscheduled:count('unscheduled'),important:view.tasks.filter(t=>t.item.important).length},
   quickNotes:view.notes.length,links:view.links.length,imported:items.filter(i=>i.origin).length+(p.readLater??[]).filter(r=>r.origin).length,
   readingQueue:{unread:view.reading.length,read:(p.readLater??[]).filter(r=>r.read).length},bookmarks:p.bookmarks.length,workspaces:1+Object.keys(p.workspaceSlots??{}).length},
  openTasks,openTasksTruncated:view.tasks.length>openTasks.length,titlesIncluded:includeTitles,
  excluded:['document and notebook bodies','quick-note text','annotations and remarks','reading history','credentials and environment values']};
 // The snapshot identity covers the data (including titles), not the clock or the title option.
 return {...body,generatedAt:o.generatedAt,sourceRevision:fingerprint({...body,openTasks:fullTasks,titlesIncluded:true})};
}
