import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {compose,blankWorkspace,searchCatalog,normalize,locations,pageText,blocksText} from '../dist-offline/app/core/workspace.js';
import {walkBlocks} from '../dist-offline/app/core/validation.mjs';
import {visitCheatsheetBlocks} from '../dist-offline/app/cheatsheets/validation.mjs';
import {blockText as sheetBlockText} from '../dist-offline/app/cheatsheets/text-layout.mjs';
import {buildResourceFacts,filterProjects,experienceCounts} from '../dist-offline/app/experience/facts.js';
import {profileFromPreset} from '../dist-offline/app/experience/profile.mjs';
import {projectLibrary} from '../dist-offline/app/content-hub/taxonomy.js';
const built=JSON.parse(await fs.readFile('dist-offline/content.json','utf8'));
const ws=blankWorkspace(),catalogue=compose(built,ws);

/** The pre-V3 implementation, verbatim, as the equivalence oracle. */
function legacySearch(c,query){const words=normalize(query).trim().split(/\s+/).filter(Boolean);if(!words.length)return {pages:[],terms:[]};const locs=locations(c);const hits=c.pages.map(page=>{const text=normalize([page.title,page.summary,page.tags.join(' '),pageText(page),locs.get(page.id)?.path.join(' ')].join(' '));const score=words.every(w=>text.includes(w))?words.reduce((s,w)=>s+(normalize(page.title).includes(w)?10:1),0):0;let anchor;if(page.cheatsheet)for(const sheet of page.cheatsheet.pages)visitCheatsheetBlocks(sheet.blocks,b=>{if(!anchor&&words.every(w=>normalize(sheetBlockText(b)).includes(w)))anchor=b.id;});walkBlocks(page.blocks,b=>{if(!anchor&&words.every(w=>normalize(blocksText([b])).includes(w)))anchor=b.id;});return {page,score,anchor};}).filter(p=>p.score>0).sort((a,b)=>b.score-a.score);const terms=c.glossary.filter(t=>words.every(w=>normalize([t.label,t.definition,t.translation,t.example,...(t.aliases??[]),...(t.tags??[])].filter(Boolean).join(' ')).includes(w)));return {pages:hits,terms};}
const shape=r=>({pages:r.pages.map(h=>[h.page.id,h.score,h.anchor??null]),terms:r.terms.map(t=>t.id)});
const QUERIES=['window','Window functions','grain join','SELECT','groupby','V2','ikke','spark cache','Norsk','delta lake','café','PDF','page','ROWS RANGE','qualify','anti','cardinality','x_y','42','  '];

test('V3 cached search returns exactly the legacy results (pages, scores, order, anchors, terms)',()=>{
 for(const q of QUERIES)assert.deepEqual(shape(searchCatalog(catalogue,q)),shape(legacySearch(catalogue,q)),'query '+JSON.stringify(q));
 // Experience-filtered subsets reuse cached entries and stay equivalent.
 const subset={...catalogue,pages:catalogue.pages.filter((_,i)=>i%3===0)};
 for(const q of QUERIES)assert.deepEqual(shape(searchCatalog(subset,q)),shape(legacySearch(subset,q)));
});

function scaled(n){const pages=[];for(let i=0;pages.length<n;i++){const src=catalogue.pages[i%catalogue.pages.length];pages.push({...structuredClone(src),id:src.id+'.scale'+i,title:src.title+' '+i});}return {...catalogue,pages};}
const time=(fn,runs=1)=>{const t=performance.now();for(let i=0;i<runs;i++)fn();return (performance.now()-t)/runs;};
test('V3 1,500-resource scale: typing a query stays bounded and far below the legacy cost',t=>{
 const c=scaled(1500),typed=['w','wi','win','wind','windo','window','window f','window fu','window fun','window functions'];
 const legacy=time(()=>typed.forEach(q=>legacySearch(c,q)))/typed.length;
 const cold=time(()=>searchCatalog(c,'w'));
 const warm=time(()=>typed.forEach(q=>searchCatalog(c,q)),3)/typed.length;
 const facts=buildResourceFacts(c,ws.overlays),profile=profileFromPreset('data-engineering');
 const factsMs=time(()=>buildResourceFacts(c,ws.overlays)),countsMs=time(()=>experienceCounts(profile,facts),5);
 const treeMs=time(()=>filterProjects(projectLibrary(catalogue,ws.overlays,'notes'),profile,buildResourceFacts(catalogue,ws.overlays)),5);
 const report={resources:c.pages.length,legacyMsPerKeystroke:+legacy.toFixed(1),coldIndexBuildMs:+cold.toFixed(1),warmMsPerKeystroke:+warm.toFixed(2),factsIndexMs:+factsMs.toFixed(1),experienceCountsMs:+countsMs.toFixed(2),filteredTreeMs:+treeMs.toFixed(2)};
 t.diagnostic(JSON.stringify(report));
 assert.deepEqual(shape(searchCatalog(c,'window functions')),shape(legacySearch(c,'window functions')));
 assert(warm<legacy/3,'cached keystroke '+warm+' ms vs legacy '+legacy+' ms');
 assert(warm<50,'per-keystroke budget 50 ms at 1,500 resources (measured '+warm+')');
 assert(countsMs<50&&factsMs<200,'Experience evaluation budget');
});
test('V3 10,000-resource scale: cached keystroke search remains within budget',t=>{
 const c=scaled(10000),typed=['w','wi','win','wind','window','window functions'];
 const legacy=time(()=>typed.forEach(q=>legacySearch(c,q)))/typed.length;
 const cold=time(()=>searchCatalog(c,'w')),warm=time(()=>typed.forEach(q=>searchCatalog(c,q)),2)/typed.length;
 const facts=buildResourceFacts(c,ws.overlays),countsMs=time(()=>experienceCounts(profileFromPreset('norsk-daily'),facts),3);
 t.diagnostic(JSON.stringify({resources:c.pages.length,legacyMsPerKeystroke:+legacy.toFixed(1),coldIndexBuildMs:+cold.toFixed(1),warmMsPerKeystroke:+warm.toFixed(2),experienceCountsMs:+countsMs.toFixed(2)}));
 assert(warm<100,'per-keystroke budget 100 ms at 10,000 resources (measured '+warm+')');
});
