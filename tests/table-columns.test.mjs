import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleTableColumns,tableColumnKey,applyTablePreset,tableChoice,tableLayout,norskReadingWord,tableExplanationColumns,norskRelationParts,orderNorskReadingColumns,tableReadingLabel,organizeTableRows,tableRowGroups,tableFoldKey,setTableChoice,setTableLayout} from '../dist-offline/app/reader/table-columns.js';
import {blankPersonal} from '../dist-offline/app/core/workspace.js';
import {validatePersonal} from '../src/storage/personal-validation.mjs';

test('Column search and nested source groups preserve source indices and do not invent categories',()=>{
 const columns=['Norsk','English','Category','Subcategory','Type'],rows=[['båt','boat','Travel','Water','noun'],['bil','car','Travel','Road','noun'],['ærlig','honest','People','Character','adjective'],['tog','train','Travel','Road','noun']],before=structuredClone(rows);
 const g=tableRowGroups(columns,rows,'norsk','category-subcategory',{query:'ROAD',column:3});
 assert.deepEqual(g.map(x=>[x.title,x.depth,x.count]),[['Travel',0,2],['Road',1,2]]);
 assert.equal(g[1].parent,g[0].key);assert.deepEqual(g[1].items.map(x=>x.index),[1,3]);
 assert.equal(tableRowGroups(columns,rows,'source','none',{query:'boat',column:0}).length,0);
 assert.deepEqual(tableRowGroups(columns,rows,'source','none',{query:'boat',column:-1})[0].items.map(x=>x.index),[0]);
 assert.deepEqual(tableRowGroups(columns,rows,'source','none',{query:'ÆRLIG',column:0})[0].items.map(x=>x.index),[2]);
 assert.deepEqual(rows,before);
 assert.equal(tableRowGroups(['Norsk','English'],[['båt','boat']],'source','category-subcategory')[0].title,'');
 assert.notEqual(tableFoldKey('a','one',g[0].key),tableFoldKey('a','two',g[0].key));
 const personal=blankPersonal();personal.session.panes[0].views.push({id:'view.groups',history:[],cursor:0,collapsed:{},revealed:{[tableFoldKey('a','one',g[0].key)]:true},english:true});personal.session.panes[0].active='view.groups';validatePersonal(personal);
});

test('Bilingual source explanations form a compact two-column projection, independently hideable',()=>{
 const columns=['Norsk','English','Forms','Type','Synonyms','Antonyms','Norsk forklaring','English explanation'],state={};
 applyTablePreset('a',columns,state,'explanations');assert.equal(tableLayout('a',state),'cards2');
 assert.deepEqual(orderNorskReadingColumns(columns,visibleTableColumns('a',columns,state)),[0,1,6,7,4,5]);
 state[tableColumnKey('a',columns[7],7)]=true;assert.deepEqual(orderNorskReadingColumns(columns,visibleTableColumns('a',columns,state)),[0,1,6,4,5]);
 assert.deepEqual(tableExplanationColumns(['Norsk forklaring','English explanation','Description']),[0,1]);
 assert.equal(tableReadingLabel('Synonyms'),'Syn');assert.equal(tableReadingLabel('Antonyms'),'Ant');
 assert.deepEqual(norskRelationParts('rørelse (movement) · aktivitet (activity)'),[{text:'rørelse ',bold:true},{text:'(movement)',bold:false},{text:' · aktivitet ',bold:true},{text:'(activity)',bold:false}]);
 assert.deepEqual(norskRelationParts(''),[]);assert.deepEqual(norskRelationParts('—'),[{text:'—',bold:false}]);
 applyTablePreset('a',columns,state,'words');assert.deepEqual(visibleTableColumns('a',columns,state),[0,1,4,5]);
 assert.deepEqual(visibleTableColumns('a',columns,state,true),[0,1,2,3,4,5,6,7]);
});
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

test('Table palettes and distinct layouts are bounded independent personal preferences',()=>{
 const state={};assert.equal(tableChoice('a',state,'palette'),'black');
 setTableChoice('a',state,'palette','forest');setTableLayout('a',state,'tiles');
 assert.equal(tableChoice('a',state,'palette'),'forest');assert.equal(tableChoice('b',state,'palette'),'black');assert.equal(tableLayout('a',state),'tiles');
 setTableChoice('a',state,'palette','paper');setTableLayout('a',state,'dictionary');
 assert.equal(tableChoice('a',state,'palette'),'paper');assert.equal(tableLayout('a',state),'dictionary');
 applyTablePreset('a',['Norsk','English'],state,'compact');assert.equal(tableChoice('a',state,'palette'),'paper');
 const personal=blankPersonal();personal.session.panes[0].views.push({id:'view.test',history:[],cursor:0,collapsed:{},revealed:state,english:true});personal.session.panes[0].active='view.test';validatePersonal(personal);
});
test('Words hides grammar/type, keeps source relations and retains layout/sort/group',()=>{
 const columns=['Norsk','English','Forms','Type','Synonyms','Antonyms'],state={};
 setTableLayout('a',state,'cards3');setTableChoice('a',state,'sort','reverse');setTableChoice('a',state,'group','letter');
 applyTablePreset('a',columns,state,'words');assert.deepEqual(visibleTableColumns('a',columns,state),[0,1,4,5]);
 assert.equal(tableLayout('a',state),'cards3');assert.equal(tableChoice('a',state,'sort'),'reverse');assert.equal(tableChoice('a',state,'group'),'letter');
 assert.deepEqual(visibleTableColumns('b',columns,state),[0,1,4,5]);assert.deepEqual(visibleTableColumns('a',columns,state,true),[0,1,2,3,4,5]);
 const explicit={[tableColumnKey('b','Forms',2)]:false,[tableColumnKey('b','Antonyms',5)]:true};assert.deepEqual(visibleTableColumns('b',columns,explicit),[0,1,2,4]);
});
test('Norsk reading prefixes use explicit source forms without guessing or rewriting cells',()=>{
 const columns=['Norsk','English','Forms','Type'];
 const rows=[['bevegelse','movement','sg: (u) en bevegelse; (d) bevegelsen','nou'],['bok','book','SG: (U) ei bok (D) boka','NOUN'],['hus','house','et hus; huset','noun'],['evakuere','evacuate','(INF) infinitiv: å evakuere; (PR) presens: evakuerer','vrb'],['en bok','book','ei bok','noun'],['alkohol (en)','alcohol','en alkohol','noun'],['ukjent','unknown','','noun'],['avgjør','decides','å avgjøre','verb'],['','','en bok','noun']];
 const original=structuredClone(rows);assert.deepEqual(rows.map(row=>norskReadingWord(columns,row)),['en bevegelse','ei bok','et hus','å evakuere','en bok','alkohol (en)','ukjent','avgjør','']);assert.deepEqual(rows,original);
 assert.equal(norskReadingWord(['Norsk','English','Gender'],['barn','child','et']),'et barn');
});
