import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PRESETS,profileFromPreset,validateExperience,evaluate,isAllContent,includeResource,canonicalSubject} from '../dist-offline/app/experience/profile.mjs';
import {buildResourceFacts,filterProjects,experienceCounts} from '../dist-offline/app/experience/facts.js';
import {blankWorkspace,blankPersonal,compose} from '../dist-offline/app/core/workspace.js';
import {selectWorkspace,activeSession} from '../dist-offline/app/core/workspace-slots.js';
import {validatePersonal} from '../dist-offline/app/storage/personal-validation.mjs';
import {saveReadingState,restoreReadingState} from '../dist-offline/app/core/saved-states.js';
import {projectLibrary} from '../dist-offline/app/content-hub/taxonomy.js';
const built=JSON.parse(await fs.readFile('dist-offline/content.json','utf8'));
const ws=blankWorkspace(),catalogue=compose(built,ws),facts=buildResourceFacts(catalogue,ws.overlays);

test('V3 Experience presets validate and use canonical SubjectKey values only',()=>{
 for(const p of PRESETS){const profile=profileFromPreset(p.id);validateExperience(profile);for(const id of profile.subjects.ids??[])assert(['it','cloud','job','kpi','norsk'].includes(id),p.id+' uses '+id);}
 assert.equal(canonicalSubject('informatics'),'it');assert.equal(canonicalSubject('personal'),'kpi');assert.equal(canonicalSubject('norsk'),'norsk');
 assert(isAllContent(profileFromPreset('all')));assert(!isAllContent(profileFromPreset('norsk-daily')));
});
test('V3 Experience validation is strict, bounded and fails visibly on unknown versions',()=>{
 const good=profileFromPreset('norsk-daily');
 const bad=(fn,re)=>{const p=structuredClone(good);fn(p);assert.throws(()=>validateExperience(p),re);};
 bad(p=>{p.schemaVersion=2;},/unsupported schema version 2/);
 bad(p=>{p.subjects={mode:'selected',ids:['informatics']};},/subjects ID/);
 bad(p=>{p.types.video=true;},/content type video/);
 bad(p=>{delete p.types.qcm;},/content type qcm/);
 bad(p=>{p.pdfs={mode:'all',ids:['x']};},/only apply to selected/);
 bad(p=>{p.include=['a'];p.exclude=['a'];},/both included and excluded/);
 bad(p=>{p.include=Array.from({length:2001},(_,i)=>'r'+i);},/included resource/);
 bad(p=>{p.predicate='return true';},/unknown field predicate/);
 bad(p=>{p.projects={mode:'selected',ids:['a','a']};},/duplicate/);
 assert.equal(validateExperience(undefined),true,'absent profile = All content');
});
test('V3 Experience evaluator: type gate, exclude, include override, empty selection means none',()=>{
 const p=profileFromPreset('norsk-daily');
 const norskNote={id:'n1',type:'notes',subject:'norsk'},itNote={id:'i1',type:'notes',subject:'it'},sheet={id:'c1',type:'cheatsheets',subject:'norsk'};
 assert.equal(evaluate(p,norskNote).visible,true);
 assert.equal(evaluate(p,itNote).reason,'subject');
 assert.equal(evaluate(p,sheet).reason,'type');
 assert.equal(evaluate(p,{...itNote,subject:'informatics'}).visible,false,'legacy alias maps to it, not norsk');
 const withInclude={...p,include:['i1','c1']};
 assert.equal(evaluate(withInclude,itNote).reason,'included','include overrides subject');
 assert.equal(evaluate(withInclude,sheet).reason,'type','include never bypasses a disabled type');
 assert.equal(evaluate({...p,exclude:['n1']},norskNote).reason,'excluded');
 assert.equal(evaluate({...p,subjects:{mode:'selected',ids:[]}},norskNote).visible,false,'empty selected list = none');
 assert.equal(evaluate({...p,subjects:{mode:'none'}},norskNote).visible,false);
 const pdf={id:'pdf.page',type:'pdfs',subject:'norsk'};
 assert.equal(evaluate(p,pdf).visible,true);assert.equal(evaluate({...p,pdfs:{mode:'selected',ids:['other']}},pdf).reason,'pdf');
 assert.throws(()=>includeResource(p,'c1','cheatsheets'),/turned off/,'never enables a type implicitly');
 const added=includeResource(p,'c1','cheatsheets',true);assert.equal(added.types.cheatsheets,true);assert.deepEqual(added.include,['c1']);
});
test('V3 Experience facts come from real catalogue metadata and filter tree projections upstream',()=>{
 assert.equal(facts.size,catalogue.pages.length);
 const norskIds=[...facts.values()].filter(f=>f.subject==='norsk').map(f=>f.id);assert(norskIds.length>0,'real Norsk resources exist');
 const counts=experienceCounts(profileFromPreset('norsk-daily'),facts);
 assert(counts.visible>0&&counts.visible<counts.total,'Norsk Daily shows a real, strict subset');
 assert.equal(counts.byType.cheatsheets,0);assert.equal(experienceCounts(profileFromPreset('all'),facts).visible,counts.total);
 const projects=filterProjects(projectLibrary(catalogue,ws.overlays,'notes'),profileFromPreset('norsk-daily'),facts);
 const ids=[];const walk=ns=>ns.forEach(n=>{if(n.pageId)ids.push(n.pageId);walk(n.children??[]);});projects.forEach(p=>walk(p.nodes));
 assert(ids.length>0);assert(ids.every(id=>facts.get(id).subject==='norsk'),'no hidden subject leaks into the tree');
 const all=projectLibrary(catalogue,ws.overlays,'notes');assert.strictEqual(filterProjects(all,profileFromPreset('all'),facts),all,'All content is a no-op');
});
test('V3 Experience is per workspace slot and validated with the live personal validator',()=>{
 const p=blankPersonal();selectWorkspace(p,2);selectWorkspace(p,1);
 p.workspaceSlots[2].experience=profileFromPreset('norsk-daily');
 validatePersonal(p);
 assert.equal(activeSession(p,1).experience,undefined,'slot 1 unaffected');
 const broken=structuredClone(p);broken.workspaceSlots[2].experience.schemaVersion=9;
 assert.throws(()=>validatePersonal(broken),/unsupported schema version 9/);
});
test('V3 saved states: old checkpoint keeps the current Experience; new checkpoint restores its own',()=>{
 const p=blankPersonal();selectWorkspace(p,2);
 const old=saveReadingState(p,2,'Before V3',1000);
 p.workspaceSlots[2].experience=profileFromPreset('norsk-daily');
 restoreReadingState(p,old,2000);
 assert.equal(p.workspaceSlots[2].experience.presetId,'norsk-daily','pre-Experience checkpoint preserves current profile');
 const saved=saveReadingState(p,2,'With Norsk',3000);
 p.workspaceSlots[2].experience=profileFromPreset('interview');
 restoreReadingState(p,saved,4000);
 assert.equal(p.workspaceSlots[2].experience.presetId,'norsk-daily','checkpoint restores the profile it actually saved');
 const all=saveReadingState(p,'all','Everything',5000);p.workspaceSlots[2].experience=profileFromPreset('cloud-fabric');delete p.session.experience;
 restoreReadingState(p,all,6000);assert.equal(p.workspaceSlots[2].experience.presetId,'norsk-daily');
 validatePersonal(p);
});
