/** Interview authoring model -> ordinary AtlasNote Page/Project objects.
 * No runner, scoring, new block type or separate persistence system. */
export const INTERVIEW_STYLES=['SQL','Theory','Hybrid','Coding'];
export const SQL_PROGRESSION=[
 {step:1,family:'filter / aggregate'},
 {step:2,family:'joins + cardinality'},
 {step:3,family:'windows + ties'},
 {step:4,family:'compose logic with CTEs'},
 {step:5,family:'alternative techniques + deeper reasoning'},
 {step:6,family:'Compositional SQL'},
 {step:7,family:'Temporal / relational logic'},
 {step:8,family:'Optimization reasoning'}
];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export function validateInterviewSet(data){
 if(data?.schemaVersion!==1||!Array.isArray(data.questions)||!data.questions.length)throw Error('Invalid interview set');
 const ids=new Set();
 for(const q of data.questions){
  if(!/^[a-z0-9][a-z0-9.-]{0,79}$/.test(q.id)||ids.has(q.id))throw Error('Invalid/duplicate interview ID');ids.add(q.id);
  if(!INTERVIEW_STYLES.includes(q.style))throw Error('Unknown interview style');
  for(const key of ['title','prompt','category','subcategory','explanation','trap'])if(typeof q[key]!=='string'||!q[key].trim())throw Error('Missing interview '+key);
  for(const key of ['reasoning','followUps','intent'])if(!Array.isArray(q[key])||!q[key].length||q[key].some(x=>typeof x!=='string'||!x.trim()))throw Error('Missing interview '+key);
  if(q.example&&(typeof q.example.code!=='string'||typeof q.example.language!=='string'))throw Error('Invalid interview example');
  if(q.style==='Coding'&&(!q.pattern||!q.alternatives?.length||!q.example))throw Error('Coding reference requires a pattern, example and alternative');
 }
 return true;
}
export function questionToPage(q){
 const id='page.interview.'+q.id,blocks=[];
 const section=(suffix,title,children)=>blocks.push({type:'section',id:id+'.'+suffix,title,children});
 const md=(suffix,text)=>({type:'markdown',id:id+'.'+suffix,text});
 const code=(suffix,item)=>({type:'code',id:id+'.'+suffix,language:item.language,code:item.code,...(item.title?{title:item.title}:{}),...(item.explanation?{explanation:item.explanation}:{})});
 section('prompt','Question',[md('question',q.prompt)]);
 section('reasoning','Reasoning',[{type:'list',id:id+'.reasoning-points',ordered:true,items:q.reasoning}]);
 section('answer','Answer / mental model',[md('explanation',q.explanation)]);
 if(q.example)section('example','Example',[code('code',q.example)]);
 if(q.diagram)section('architecture','Architecture',[{type:'diagram',id:id+'.diagram',format:'mermaid',code:q.diagram,caption:'Original conceptual illustration; implementation boundaries depend on the system.',source:{title:'AtlasNote interview samples',note:'Author-created conceptual diagram.'}}]);
 if(q.alternatives?.length)section('alternatives','Alternative / tradeoff',q.alternatives.flatMap((a,i)=>[md('alternative-'+i,a.text),...(a.code?[code('alternative-code-'+i,a)]:[])]));
 if(q.complexity)section('complexity','Complexity / tradeoff',[md('cost',q.complexity)]);
 section('trap','Common mistake / trap',[{type:'callout',id:id+'.trap-note',tone:'warning',title:'Watch for this',text:q.trap}]);
 section('followup','Follow-up',[{type:'list',id:id+'.followups',items:q.followUps}]);
 section('intent','Interviewer intent',[{type:'list',id:id+'.intent-points',items:q.intent}]);
 section('reflection','Reflection',[md('reflection-prompt',(q.reflectionPrompt??'What pattern did I recognize, where did I get stuck, and what would I change in my first approach?')+'\n\nUse Context > Remarks for your personal reflection. It is saved separately from this reference.')]);
 return {id,title:q.title,summary:q.style+' / '+[q.category,q.subcategory,q.topic].filter(Boolean).join(' / '),blocks,related:(q.related??[]).map(id=>'page.interview.'+id),terms:[],sources:q.sources??[],tags:['interview',q.style.toLowerCase(),...(q.pattern?['pattern:'+q.pattern]:[]),...(q.series?['series:'+q.series]:[])],provenance:'Original educational prototype. Prompts Q1-Q5 preserve the user-provided canonical SQL sequence. Examples are reference code, not executable tasks.'};
}
export function interviewProject(questions){
 const project={id:'project.interview-preparation',title:'Interview Preparation',icon:'code',description:'Reasoning-first SQL, theory, hybrid and coding references. No execution or scoring.',nodes:[]};
 for(const q of questions){let nodes=project.nodes,path='node.interview';for(const title of [q.category,q.subcategory,q.topic].filter(Boolean)){
  path+='.'+slug(title);let folder=nodes.find(n=>n.id===path);if(!folder){folder={id:path,title,children:[]};nodes.push(folder);}nodes=folder.children;
 }
 nodes.push({id:'node.interview.'+q.id,title:q.title,pageId:'page.interview.'+q.id});}
 return project;
}
