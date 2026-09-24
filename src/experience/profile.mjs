/** V3 per-workspace Experience profile (docs/v3 architecture 04).
 * A profile is a versioned SELECTION over canonical metadata. It never owns,
 * copies, deletes or re-classifies resources, and it is never passed to
 * history, compaction or full-backup code. An absent profile means All content.
 *
 * Canonical vocabulary only: SubjectKey it|cloud|job|kpi|norsk and library
 * modes notes|pdfs|cheatsheets|articles|qcm. Legacy category aliases
 * (informatics, personal) are mapped at the ingestion boundary. */
export const EXPERIENCE_SCHEMA=1;
export const LIBRARY_MODES=['notes','pdfs','cheatsheets','articles','qcm'];
export const SUBJECT_KEYS=['it','cloud','job','kpi','norsk'];
const LEGACY_SUBJECT={informatics:'it',personal:'kpi'};
export const LIMITS={ids:2000,name:80};
const ID=/^[A-Za-z0-9][A-Za-z0-9._:@\/-]{0,299}$/;
export const canonicalSubject=value=>SUBJECT_KEYS.includes(value)?value:LEGACY_SUBJECT[value];

const all=()=>({mode:'all'});
const only=ids=>({mode:'selected',ids});
const types=(...on)=>Object.fromEntries(LIBRARY_MODES.map(m=>[m,on.includes(m)]));
/** Editable templates, not forced slot assignments. Subject-based so they only
 * reference canonical vocabulary that exists in every library. */
export const PRESETS=[
 {id:'all',revision:1,name:'All content',types:types(...LIBRARY_MODES),subjects:all()},
 {id:'data-engineering',revision:1,name:'Data Engineering',types:types(...LIBRARY_MODES),subjects:only(['it'])},
 {id:'cloud-fabric',revision:1,name:'Cloud / Fabric',types:types(...LIBRARY_MODES),subjects:only(['cloud'])},
 {id:'norsk-daily',revision:1,name:'Norsk Daily',types:types('notes','pdfs','articles','qcm'),subjects:only(['norsk'])},
 {id:'interview',revision:1,name:'Interview',types:types('notes','articles','qcm','cheatsheets'),subjects:only(['job','it'])},
];
export function profileFromPreset(id){
 const p=PRESETS.find(x=>x.id===id);if(!p)throw Error('Unknown Experience preset: '+id);
 return {schemaVersion:EXPERIENCE_SCHEMA,presetId:p.id,presetRevision:p.revision,name:p.name,types:{...p.types},subjects:structuredClone(p.subjects),projects:all(),pdfs:all(),include:[],exclude:[]};
}
export const defaultProfile=()=>profileFromPreset('all');
/** Resolve the effective profile of a session. Absent means All content. */
export function effectiveProfile(session){return session?.experience??defaultProfile();}
export function isAllContent(profile){
 if(!profile)return true;const p=profile;
 return LIBRARY_MODES.every(m=>p.types[m])&&p.subjects.mode==='all'&&p.projects.mode==='all'&&p.pdfs.mode==='all'&&!p.include.length&&!p.exclude.length;
}

/** Strict, JSON-only validation. Unknown future versions fail visibly. */
export function validateExperience(value){
 if(value===undefined)return true;
 const fail=m=>{throw Error('Invalid workspace Experience: '+m);};
 const plain=(x,n)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)fail(n);};
 plain(value,'profile');
 if(value.schemaVersion!==EXPERIENCE_SCHEMA)fail('unsupported schema version '+String(value.schemaVersion)+'; the stored profile was retained');
 const known=['schemaVersion','presetId','presetRevision','name','types','subjects','projects','pdfs','include','exclude'];
 for(const k of Object.keys(value))if(!known.includes(k))fail('unknown field '+k);
 if(typeof value.presetId!=='string'||!/^[a-z0-9-]{1,40}$/.test(value.presetId))fail('preset');
 if(!Number.isInteger(value.presetRevision)||value.presetRevision<1||value.presetRevision>100000)fail('preset revision');
 if(value.name!==undefined&&(typeof value.name!=='string'||value.name.length>LIMITS.name))fail('name');
 plain(value.types,'types');for(const k of Object.keys(value.types))if(!LIBRARY_MODES.includes(k))fail('content type '+k);
 for(const m of LIBRARY_MODES)if(typeof value.types[m]!=='boolean')fail('content type '+m);
 const ids=(list,n,check=x=>ID.test(x))=>{if(!Array.isArray(list)||list.length>LIMITS.ids)fail(n);const seen=new Set();for(const x of list){if(typeof x!=='string'||!check(x))fail(n+' ID');if(seen.has(x))fail('duplicate '+n+' ID');seen.add(x);}};
 const selection=(s,n,check)=>{plain(s,n);for(const k of Object.keys(s))if(!['mode','ids'].includes(k))fail(n+' field '+k);if(!['all','selected','none'].includes(s.mode))fail(n+' mode');if(s.mode==='selected')ids(s.ids,n,check);else if(s.ids!==undefined)fail(n+' IDs only apply to selected mode');};
 selection(value.subjects,'subjects',x=>SUBJECT_KEYS.includes(x));selection(value.projects,'projects');selection(value.pdfs,'PDF selection');
 ids(value.include,'included resource');ids(value.exclude,'excluded resource');
 if(value.include.some(x=>value.exclude.includes(x)))fail('a resource cannot be both included and excluded');
 return true;
}

const selected=(s,id)=>s.mode==='all'||s.mode==='selected'&&id!==undefined&&s.ids.includes(id);
/** One evaluator for tree, search, counts and loaders.
 * facts: {id, type, subject?, projectId?}. Returns a decision with a reason.
 * - a disabled type always hides (an explicit include never bypasses it);
 * - explicit exclude always hides;
 * - explicit include overrides subject/project/PDF selection (UI explains it);
 * - mode all is neutral, none denies, selected matches IDs;
 * - an empty selected list means none, never a hidden "all". */
export function evaluate(profile,facts){
 const p=profile??defaultProfile();
 if(!p.types[facts.type])return {visible:false,reason:'type'};
 if(p.exclude.includes(facts.id))return {visible:false,reason:'excluded'};
 if(p.include.includes(facts.id))return {visible:true,reason:'included'};
 const subject=canonicalSubject(facts.subject);
 if(!selected(p.subjects,subject))return {visible:false,reason:'subject'};
 if(facts.projectId!==undefined&&!selected(p.projects,facts.projectId))return {visible:false,reason:'project'};
 if(p.projects.mode==='none')return {visible:false,reason:'project'};
 if(facts.type==='pdfs'&&!selected(p.pdfs,facts.id))return {visible:false,reason:'pdf'};
 return {visible:true,reason:'selection'};
}
/** Explicit, reviewable profile edit used by "Add to Experience". */
/** A disabled content type is never enabled implicitly: pass enableType only
 * after the user explicitly agreed to show that type in this workspace. */
export function includeResource(profile,id,type,enableType=false){
 const p=structuredClone(profile??defaultProfile());
 if(!ID.test(id))throw Error('Invalid resource ID');
 if(type&&!p.types[type]){if(!enableType)throw Error('This content type is turned off in this Experience.');p.types[type]=true;}
 p.exclude=p.exclude.filter(x=>x!==id);if(!p.include.includes(id))p.include.push(id);
 validateExperience(p);return p;
}
