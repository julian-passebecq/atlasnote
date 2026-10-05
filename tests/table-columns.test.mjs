import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleTableColumns,tableColumnKey} from '../dist-offline/app/reader/table-columns.js';
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
