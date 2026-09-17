import fs from 'node:fs/promises';
import path from 'node:path';
import {questionToPage,interviewProject,validateInterviewSet,SQL_PROGRESSION} from '../src/interview/content.mjs';
const data=JSON.parse(await fs.readFile('content/interviews/questions.json','utf8'));validateInterviewSet(data);
const root='content/packs/atlas.interview-samples',files=new Map();
const manifest={format:'atlas-content-pack',schemaVersion:1,payloadSchema:'atlas.bundle@2',id:'atlas.interview-samples',version:'1.0.0',title:'Interview Preparation',visibility:'public',files:{projects:'projects.json',pages:'pages',glossary:'glossary.json'},requires:[],assets:[],provenance:{kind:'author-created',note:'Original reasoning-first samples. Canonical SQL prompts supplied by the user; no private library content or third-party assets.'}};
files.set('atlas-pack.json',manifest);files.set('projects.json',[interviewProject(data.questions)]);files.set('glossary.json',[]);
for(const question of data.questions)files.set('pages/page.interview.'+question.id+'.json',questionToPage(question));
files.set('sql-progression.json',SQL_PROGRESSION);
const check=process.argv.includes('--check');
for(const [file,value] of files){const name=path.join(root,file),text=JSON.stringify(value,null,2)+'\n';if(check){if(await fs.readFile(name,'utf8')!==text)throw Error('Generated interview content is stale: '+name);}else{await fs.mkdir(path.dirname(name),{recursive:true});await fs.writeFile(name,text);}}
const pages=await fs.readdir(path.join(root,'pages'));if(pages.some(p=>!files.has('pages/'+p)))throw Error('Unexpected generated interview page');
console.log(`${check?'Verified':'Generated'} ${data.questions.length} native interview pages and Q1-Q8 progression.`);
