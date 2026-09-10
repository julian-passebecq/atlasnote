import type {Page,Project,TreeNode,Group,Overlays,Personal,Workspace,View,Location,Catalogue,Pack,StructuralOperation,Session} from './model.js';
import {selectPacks} from './packs.mjs';
import {pageLinks,walkBlocks,stable} from './validation.mjs';
export const uid=(prefix='id')=>prefix+'.'+crypto.randomUUID().replaceAll('-','');
export function blankOverlays():Overlays{return {schemaVersion:2,pages:{},projects:[],projectPrefs:{},operations:[],archived:[],groups:null,documents:[]};}
export function blankPersonal():Personal{return {schemaVersion:2,notes:{},ratings:{},bookmarks:[],session:{panes:[{id:'left',views:[],active:''}],activePane:'left',ratio:50,screen:'home',leftOpen:true,rightOpen:true,focus:false,theme:'fluent',showFlags:true,expanded:[],fontSize:16}};}
export function blankWorkspace():Workspace{return {imports:[],overlays:blankOverlays(),personal:blankPersonal(),assets:[],generation:0};}
export function current(view:View|undefined){return view?.history[view.cursor];}
export function newLocation(pageId:string):Location{return {pageId,presentation:'continuous',pdfMode:'single',pdfPage:1,zoom:1,rotation:0,cover:false};}
function locationWithAnchor(pageId:string,anchor?:any):Location{const location=newLocation(pageId);if(anchor!==undefined)location.anchor=anchor;return location;}
export function newView(pageId:string,anchor?:any):View{return {id:uid('view'),history:[locationWithAnchor(pageId,anchor)],cursor:0,collapsed:{},revealed:{},english:true};}
export function navigate(view:View,pageId:string,anchor?:any):View{const here=current(view);if(here?.pageId===pageId&&!anchor)return view;return {...view,history:[...view.history.slice(0,view.cursor+1),locationWithAnchor(pageId,anchor)],cursor:view.cursor+1};}
export function travel(view:View,delta:number):View{return {...view,cursor:Math.max(0,Math.min(view.history.length-1,view.cursor+delta))};}
export function findNode(projects:Project[],id:string):{node:TreeNode;list:TreeNode[];index:number;project:Project;ancestors:string[]}|undefined{
 function walk(ns:TreeNode[],p:Project,ancestors:string[]):any{for(let i=0;i<ns.length;i++){if(ns[i].id===id)return {node:ns[i],list:ns,index:i,project:p,ancestors};const r=walk(ns[i].children??[],p,[...ancestors,ns[i].id]);if(r)return r;}}
 for(const p of projects){const r=walk(p.nodes,p,[p.id]);if(r)return r;}
}
export function applyOperation(projects:Project[],op:StructuralOperation){const old=findNode(projects,op.nodeId);
 if(op.kind==='rename'){if(old)old.node.title=op.title!;return;}
 if(op.kind==='order'){if(old){const at=Math.max(0,Math.min(old.list.length-1,old.index+(op.delta??0)));old.list.splice(old.index,1);old.list.splice(at,0,old.node);}return;}
 const project=projects.find(p=>p.id===op.projectId);if(!project)throw Error('Destination project no longer exists');
 let list=project.nodes;
 if(op.parentId){const dest=findNode(projects,op.parentId);if(!dest||dest.node.pageId)throw Error('Destination must be a folder');if(dest.project.id!==project.id)throw Error('Destination project/folder mismatch');if(op.nodeId===dest.node.id||dest.ancestors.includes(op.nodeId))throw Error('Cycle blocked: a folder cannot be moved inside itself.');list=dest.node.children??(dest.node.children=[]);}
 if(op.kind==='add'){if(old)return;if(!op.node)throw Error('Missing node');list.push(structuredClone(op.node));}
 if(op.kind==='move'){if(!old)throw Error('Moved node no longer exists');old.list.splice(old.index,1);list.push(old.node);}
}
export function compose(built:{packs:Pack[];groups:Group[]},ws:Workspace):Catalogue{
 const chosen=selectPacks(built.packs,ws.imports);const projects:Project[]=structuredClone(chosen.packs.flatMap(p=>p.projects));projects.push(...structuredClone(ws.overlays.projects));const warnings=[...chosen.warnings];
 for(const op of ws.overlays.operations){try{applyOperation(projects,op);}catch(e){warnings.push((e as Error).message+' ('+op.nodeId+')');}}
 for(const p of projects)Object.assign(p,ws.overlays.projectPrefs[p.id]??{});
 projects.sort((a,b)=>(ws.overlays.projectPrefs[a.id]?.order??1000)-(ws.overlays.projectPrefs[b.id]?.order??1000));
 const owners:Record<string,string>={};const pages:Map<string,Page>=new Map();
 for(const pack of chosen.packs){for(const p of pack.pages){pages.set(p.id,p);owners[p.id]=pack.manifest.id;}for(const p of pack.projects)owners[p.id]=pack.manifest.id;for(const t of pack.glossary)owners[t.id]=pack.manifest.id;}
 for(const {page,baseHash}of Object.values(ws.overlays.pages)){if(baseHash){const pack=chosen.packs.find(p=>p.manifest.id===owners[page.id]);if(pack&&pack.hash!==baseHash)warnings.push('Local overlay '+page.id+' is retained over an updated source. Review the rebase in Settings.');}pages.set(page.id,page);owners[page.id]??='local';}
 for(const p of ws.overlays.projects)owners[p.id]='local';
 const docs=[...chosen.packs.flatMap(p=>p.documents??[]),...ws.overlays.documents];
 return {projects,pages:[...pages.values()],glossary:chosen.packs.flatMap(p=>p.glossary),groups:ws.overlays.groups??built.groups,packs:chosen.packs,owners,documents:docs,warnings};
}
export function locations(c:Catalogue){const result=new Map<string,{project:Project;ancestors:string[];path:string[];nodeId:string}>();function walk(p:Project,ns:TreeNode[],path:string[],ancestors:string[]){for(const n of ns){if(n.pageId)result.set(n.pageId,{project:p,ancestors,path:[...path,n.title],nodeId:n.id});if(n.children)walk(p,n.children,[...path,n.title],[...ancestors,n.id]);}}for(const p of c.projects)walk(p,p.nodes,[p.title],[p.id]);return result;}
export function isArchived(pageId:string,c:Catalogue,overlays:Overlays){const loc=locations(c).get(pageId);return overlays.archived.includes(pageId)||!!loc&&[loc.nodeId,...loc.ancestors].some(id=>overlays.archived.includes(id));}
export function blocksText(blocks:any[],opts={english:true,answers:true}):string{return blocks.map(b=>{switch(b.type){case 'section':return b.title+'\n'+blocksText(b.children,opts);case 'markdown':return b.text;case 'callout':return b.title+'\n'+b.text;case 'list':return b.items.join('\n');case 'table':return [b.columns,...b.rows].map(x=>x.join(' | ')).join('\n');case 'code':return [b.title,b.code,b.explanation,b.output].filter(Boolean).join('\n');case 'bilingual':return b.no+(opts.english?'\n'+b.en:'')+(b.hint?'\n'+b.hint:'');case 'question':return b.question+(opts.answers?'\n'+b.answer+(b.followUp?'\n'+b.followUp:''):'\n[Answer omitted]');case 'image':case 'diagram':return b.caption+'\n'+(b.code??'')+'\nSource: '+b.source.title+(b.source.url?' '+b.source.url:'');case 'link':return `${b.label??b.pageId} [${b.pageId}]`;default:return '';}}).join('\n\n');}
export function normalize(s:string){return s.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
export function searchCatalog(c:Catalogue,query:string){const words=normalize(query).trim().split(/\s+/).filter(Boolean);if(!words.length)return {pages:[],terms:[]};const locs=locations(c);const hits=c.pages.map(page=>{const text=normalize([page.title,page.summary,page.tags.join(' '),blocksText(page.blocks),locs.get(page.id)?.path.join(' ')].join(' '));const score=words.every(w=>text.includes(w))?words.reduce((s,w)=>s+(normalize(page.title).includes(w)?10:1),0):0;let anchor:string|undefined;walkBlocks(page.blocks,(b:any)=>{if(!anchor&&words.every(w=>normalize(blocksText([b])).includes(w)))anchor=b.id;});return {page,score,anchor};}).filter(p=>p.score>0).sort((a,b)=>b.score-a.score);const terms=c.glossary.filter(t=>words.every(w=>normalize([t.label,t.definition,t.translation,t.example,...(t.aliases??[]),...(t.tags??[])].filter(Boolean).join(' ')).includes(w)));return {pages:hits,terms};}
export function makeMarkdownPage(title:string,text:string):Page{return {id:uid('page.local'),title,summary:'',blocks:[{id:uid('block'),type:'markdown',text}],related:[],terms:[],sources:[],tags:['Personal']};}
export function editPageLosslessly(page:Page,title:string,summary:string,textByBlock:Record<string,string>){const p=structuredClone(page);p.title=title;p.summary=summary;walkBlocks(p.blocks,(b:any)=>{if(b.type==='markdown'&&Object.hasOwn(textByBlock,b.id))b.text=textByBlock[b.id];});return p;}
export function exportText(page:Page,opts:{english:boolean;answers:boolean;notes?:string;related?:string[]}){return `# ${page.title}\n\nStable ID: ${page.id}\n\n${page.summary}\n\n${blocksText(page.blocks,opts)}\n\n## Sources\n${page.sources.map(s=>s.title+(s.url?' - '+s.url:'')).join('\n')}\n\n## Related references (not instructions)\n${(opts.related??page.related).join('\n')}${opts.notes?'\n\n## Personal remarks (explicitly included)\n'+opts.notes:''}`;}

/** Toggle Compare without reconstructing the surviving pane or its reading threads. */
export function toggleCompare(session:Session):boolean {
 const active=session.panes.find(p=>p.id===session.activePane)??session.panes[0];
 if(!active)return false;
 if(session.panes.length===2){
  session.panes=[active];session.activePane=active.id;session.ratio=50;
  session.screen=active.views.length?'reader':'home';return true;
 }
 const source=active.views.find(v=>v.id===active.active);
 if(!source||!current(source))return false;
 const view=structuredClone(source);view.id=uid('view');
 const pane={id:uid('pane'),views:[view],active:view.id};
 session.panes.push(pane);session.activePane=pane.id;session.ratio=50;session.screen='reader';return true;
}
