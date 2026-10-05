import test from 'node:test';
import assert from 'node:assert/strict';
import {displayFeatures,displayFeature,displayVisible,displayKey,resetDisplay,setAllSections} from '../dist-offline/app/reader/display.js';
import {blankPersonal} from '../dist-offline/app/core/workspace.js';
import {validatePersonal} from '../src/storage/personal-validation.mjs';
const page={id:'page.display',tags:['lang:en'],summary:'A note',sources:[{title:'Source'}],blocks:[{id:'section.a',type:'section',children:[{id:'md.a',type:'markdown',text:'Text\n```sql\nSELECT 1\n```\n| A | B |\n|---|---|\n- item'},{id:'q.a',type:'question'},{id:'bi.a',type:'bilingual'},{id:'fig.a',type:'diagram'}]}]};
const view=()=>({id:'view.display',history:[],cursor:0,collapsed:{},revealed:{},english:true});
test('Display choices describe only source features, including markdown and rendered figures',()=>{
 const d=displayFeatures(page);assert.equal(d.sections,true);assert.equal(d.bilingual,true);
 assert.deepEqual(d.features,['metadata','sources','text','list','table','code','visual','question']);assert.equal(displayFeature('figure'),'visual');assert.equal(displayFeature('heading'),undefined);
});
test('Visibility and section choices stay personal, bounded, pane/page independent and resettable',()=>{
 const a=view(),b=view(),original=structuredClone(page);a.revealed[displayKey(page.id,'code')]=true;
 assert.equal(displayVisible(page.id,a,'code'),false);assert.equal(displayVisible(page.id,b,'code'),true);assert.equal(displayVisible('other',a,'code'),true);
 setAllSections(page.blocks,a,true);assert.equal(a.collapsed['section.a'],true);assert.deepEqual(page,original);setAllSections(page.blocks,a,false);resetDisplay(page.id,a);assert.equal(displayVisible(page.id,a,'code'),true);
 const personal=blankPersonal();personal.session.panes[0].views.push(a);personal.session.panes[0].active=a.id;validatePersonal(personal);
});
test('Fixed cheatsheet controls expose blocks rather than metadata with no sheet rendering',()=>{
 const doc={...page,cheatsheet:{pages:[{blocks:[{type:'text'},{type:'table'},{type:'box',children:[{type:'code'}]},{type:'image'}]}]}};
 assert.deepEqual(displayFeatures(doc),{features:['text','table','code','visual','callout'],bilingual:false,sections:false});
});
