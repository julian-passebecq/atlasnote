import type {CheatsheetDocument,CheatsheetBlock,Frame} from './model.js';
import {validateCheatsheet} from './validation.mjs';
export type CheatsheetPreset='summary'|'architecture'|'bilingual'|'vocabulary';
export const CHEATSHEET_PRESETS:{id:CheatsheetPreset;label:string}[]=[{id:'summary',label:'Summary'},{id:'architecture',label:'Architecture'},{id:'bilingual',label:'Bilingual concept'},{id:'vocabulary',label:'Vocabulary'}];
/** Authoring starters on the unchanged native text/table/graph/sequence grammar. */
export function makeCheatsheetPreset(preset:CheatsheetPreset,id:string):CheatsheetDocument {
 const label=CHEATSHEET_PRESETS.find(p=>p.id===preset)?.label;if(!label)throw Error('Unknown cheatsheet preset.');
 const blocks:CheatsheetBlock[]=[{id:id+'.title',type:'text',role:'title',text:label+' - your topic'}],frames:Record<string,Frame>={[id+'.title']:{x:80,y:90,width:1040,height:100}};
 const add=(suffix:string,b:any,frame:Frame)=>{const bid=id+'.'+suffix;blocks.push({id:bid,...b});frames[bid]=frame;};
 if(preset==='architecture'){
  add('diagram',{type:'diagram',family:'graph',layout:'manual',preset:'flow',nodes:[{id:'source',label:'Source'},{id:'transform',label:'Transform'},{id:'serve',label:'Serve'}],nodeFrames:{source:{x:10,y:100,width:260,height:110},transform:{x:370,y:100,width:260,height:110},serve:{x:730,y:100,width:260,height:110}},edges:[{from:'source',to:'transform'},{from:'transform',to:'serve'}],caption:'Replace these labels with your reviewed system components.'},{x:80,y:290,width:1040,height:460});
  add('notes',{type:'list',items:['Ownership and data contracts','Failure boundaries and recovery','Security and operational constraints']},{x:80,y:850,width:1040,height:430});
 }else if(preset==='bilingual'){
  add('en',{type:'text',role:'section',text:'English explanation\nDefine the concept, then explain why it matters.'},{x:80,y:300,width:500,height:330});
  add('no',{type:'text',role:'section',text:'Norsk forklaring\nBeskriv begrepet og hvorfor det er viktig.'},{x:620,y:300,width:500,height:330});
  add('terms',{type:'table',columns:['Key term','Norsk','Example / eksempel'],rows:[['Concept','Begrep','Write a practical example.'],['Context','Sammenheng','Add the situation in which it applies.']]},{x:80,y:790,width:1040,height:440});
 }else if(preset==='vocabulary'){
  add('words',{type:'table',columns:['Term','Norwegian','English definition','Example'],widths:[0.18,0.2,0.3,0.32],rows:[['Topic','Tema','The subject being discussed.','Choose a topic.'],['Example','Eksempel','A specific illustration.','Give an example.'],['Explanation','Forklaring','A description that makes something clear.','Add your own explanation.']]},{x:80,y:320,width:1040,height:850});
 }else{
  add('overview',{type:'text',role:'section',text:'Core idea\nWrite the essential explanation in your own words.'},{x:80,y:280,width:1040,height:220});
  add('points',{type:'list',items:['When to use it','How it works','Common tradeoff']},{x:80,y:580,width:1040,height:320});
  add('example',{type:'code',title:'Example',language:'text',code:'Replace this with a short example.'},{x:80,y:1050,width:1040,height:280});
 }
 const doc:CheatsheetDocument={schemaVersion:'1.1',id,title:label+' - your topic',pageSize:{width:1200,height:1600},meta:{preset},pages:[{id:id+'.page',title:label,blocks,frames,outline:blocks.filter(b=>b.type!=='divider').map((b,i)=>({id:id+'.outline'+i,label:i?label+' section '+i:'Overview',blockId:b.id}))}]};validateCheatsheet(doc);return doc;
}
