import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleTableColumns,tableColumnKey,applyTablePreset,tableChoice,tableLayout,organizeTableRows,setTableChoice,setTableLayout} from '../dist-offline/app/reader/table-columns.js';
import {blankPersonal} from '../dist-offline/app/core/workspace.js';
import {validatePersonal} from '../src/storage/personal-validation.mjs';
test('CSV table recall preferences preserve original columns and printable contents',()=>{
 const columns=['Norsk','English','Forms','Example'],state={};
 assert.deepEqual(visibleTableColumns('a',columns,state),[0,1,2]);
 state[tableColumnKey('a','English',1)]=true;
 state[tableColumnKey('a','Example',3)]=false;
 assert.deepEqual(visibleTableColumns('a',columns,state),[0,2,3]);
 assert.deepEqual(visibleTableColumns('b',columns,state),[0,1,2]);
 assert.deepEqual(visibleTableColumns('a',columns,state,true),[0,1,2,3]);
 assert.deepEqual(columns,['Norsk','English','Forms','Example']);
 const personal=blankPersonal();personal.session.panes[0].views.push({id:'view.test',history:[],cursor:0,collapsed:{},revealed:state,english:true});personal.session.panes[0].active='view.test';validatePersonal(personal);
});
test('Malformed all-hidden preference still displays a column; duplicate headings have independent keys',()=>{
 const columns=['Word','Word'],state=Object.fromEntries(columns.map((c,i)=>[tableColumnKey('a',c,i),true]));
 assert.deepEqual(visibleTableColumns('a',columns,state),[0]);
 assert.notEqual(tableColumnKey('a','Word',0),tableColumnKey('a','Word',1));
 assert.deepEqual(visibleTableColumns('a',[],state),[]);
});
test('Ready-made views select only available source fields and persist as personal preferences',()=>{
 const columns=['Norsk','English','Forms','Type','Synonyms','Antonyms','Category'],state={};
 applyTablePreset('a',columns,state,'relations');
 assert.deepEqual(visibleTableColumns('a',columns,state),[0,1,4,5]);
 assert.equal(tableLayout('a',state),'cards2');
 applyTablePreset('a',columns,state,'themes');assert.equal(tableChoice('a',state,'group'),'category');
 applyTablePreset('a',columns,state,'grammar');assert.deepEqual(visibleTableColumns('a',columns,state),[0,1,2]);assert.equal(tableLayout('a',state),'table');
 applyTablePreset('a',columns,state,'alphabet');assert.equal(tableChoice('a',state,'group'),'letter');assert.equal(tableChoice('a',state,'sort'),'norsk');
 setTableLayout('a',state,'cards3');assert.equal(tableLayout('a',state),'cards3');assert.equal(tableLayout('b',state),'table');
 const personal=blankPersonal();personal.session.panes[0].views.push({id:'view.test',history:[],cursor:0,collapsed:{},revealed:state,english:true});personal.session.panes[0].active='view.test';validatePersonal(personal);
});
test('Grouping and Norwegian/English sorting retain every authored row without modifying source',()=>{
 const columns=['Norsk','English','Category','Type'],rows=[['åpen','open','Home','ADJ'],['øvelse','exercise','Work','NOUN'],['bil','car','Travel','NOUN'],['ærlig','honest','Work','ADJ'],['bil','automobile','Travel','NOUN']],original=structuredClone(rows);
 const grouped=organizeTableRows(columns,rows,'norsk','letter');assert.deepEqual(grouped.map(g=>g.title),['B','Æ','Ø','Å']);assert.deepEqual(grouped[0].items.map(x=>x.index),[2,4]);
 assert.deepEqual(organizeTableRows(columns,rows,'english','none')[0].items.map(x=>x.index),[4,2,1,3,0]);
 assert.deepEqual(organizeTableRows(columns,rows,'reverse','none')[0].items.map(x=>x.index),[0,1,3,2,4]);
 assert.deepEqual(organizeTableRows(columns,rows,'source','category').map(g=>[g.title,g.items.length]),[['Home',1],['Travel',2],['Work',2]]);
 assert.deepEqual(rows,original);
 assert.equal(organizeTableRows(['Norsk'],[['9'],['']], 'source','letter')[0].title,'#');
 const state={};setTableChoice('a',state,'sort','english');setTableChoice('a',state,'sort','source');assert.equal(tableChoice('a',state,'sort'),'source');
});
