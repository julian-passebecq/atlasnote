import {validateHubPersonal,validateTaxonomy} from '../content-hub/validation.mjs';
import {validateReadingLists,validateBookmarkReading} from './reading-validation.mjs';
import {validateSavedStates} from './saved-states-validation.mjs';
import {inspectObject,ID} from '../core/validation.mjs';
export function validatePersonal(p){
 inspectObject(p);validateHubPersonal(p);
 const fail=m=>{throw Error('Invalid saved workspace: '+m);};
 const obj=(x,n)=>{if(!x||typeof x!=='object'||Array.isArray(x))fail(n);};
 const str=(x,n,max=1000000)=>{if(typeof x!=='string'||x.length>max)fail(n);};
 const num=(x,n,lo=0,hi=Number.MAX_SAFE_INTEGER)=>{if(!Number.isFinite(x)||x<lo||x>hi)fail(n);};
 const int=(x,n,lo,hi)=>{num(x,n,lo,hi);if(!Number.isInteger(x))fail('fractional '+n);};
 const bool=(x,n)=>{if(typeof x!=='boolean')fail(n);};
 const id=(x,n)=>{if(typeof x!=='string'||!ID.test(x))fail(n);};
 const arr=(x,n,max=100000)=>{if(!Array.isArray(x)||x.length>max)fail(n);};
 const anchor=a=>{if(a===undefined)return;obj(a,'anchor');if(a.questionId!==undefined)id(a.questionId,'QCM question');if(a.blockId!==undefined)id(a.blockId,'anchor block');if(a.offset!==undefined)num(a.offset,'anchor offset');if(a.unit!==undefined)str(a.unit,'source unit',256);if(a.viewportOffset!==undefined)num(a.viewportOffset,'anchor viewport offset',-1000000,1000000);if(a.atStart!==undefined)bool(a.atStart,'anchor start');if(a.sheetId!==undefined)id(a.sheetId,'cheatsheet page ID');if(a.sheetPage!==undefined)int(a.sheetPage,'physical cheatsheet page',1,64);if(a.pdfPage!==undefined)int(a.pdfPage,'physical PDF page',1,1000000);if(a.pdfRevision!==undefined)str(a.pdfRevision,'PDF revision',256);if(a.pdfOffset!==undefined)num(a.pdfOffset,'PDF page offset',-10,10);};
 obj(p,'personal');if(![2,3].includes(p.schemaVersion))fail('schema version');
 obj(p.notes,'notes');for(const [key,n] of Object.entries(p.notes)){str(key,'remark key',600);obj(n,'remark');str(n.text,'remark text');id(n.pageId,'remark page');num(n.updatedAt,'remark timestamp');anchor(n.anchor);if(n.revision!==undefined)str(n.revision,'remark revision',256);}
 obj(p.ratings,'ratings');for(const [key,value] of Object.entries(p.ratings)){id(key,'rated page');if(!['gray','red','orange','green'].includes(value))fail('rating');}
 arr(p.bookmarks,'bookmarks');const bookmarks=new Set();for(const b of p.bookmarks){id(b.id,'bookmark ID');if(bookmarks.has(b.id))fail('duplicate bookmark');bookmarks.add(b.id);id(b.pageId,'bookmark page');str(b.title,'bookmark title',10000);num(b.createdAt,'bookmark timestamp');anchor(b.anchor);validateBookmarkReading(b);}
 if(p.readLater!==undefined)validateReadingLists(p.readLater);
 if(p.documentVisits!==undefined){arr(p.documentVisits,'document visits',50);const seen=new Set();for(const visit of p.documentVisits){obj(visit,'document visit');id(visit.pageId,'visited page');if(seen.has(visit.pageId))fail('duplicate document visit');seen.add(visit.pageId);num(visit.firstOpenedAt,'first opened');num(visit.lastOpenedAt,'last opened');if(visit.lastOpenedAt<visit.firstOpenedAt)fail('visit chronology');}}

 const sessions=[p.session];
 if(p.schemaVersion===3){
  int(p.activeWorkspaceSlot,'workspace number',1,5);obj(p.workspaceSlots,'workspace slots');
  for(const [key,s] of Object.entries(p.workspaceSlots)){if(!['2','3','4','5'].includes(key))fail('unknown workspace slot');sessions.push(s);}
  if(p.activeWorkspaceSlot!==1&&!p.workspaceSlots[p.activeWorkspaceSlot])fail('active workspace missing');
 }else if(p.workspaceSlots!==undefined||p.activeWorkspaceSlot!==undefined)fail('numbered workspaces require personal schema 3');
 if(p.savedStates!==undefined){if(p.schemaVersion!==3)fail('saved states require personal schema 3');validateSavedStates(p.savedStates,sessions);}
 for(const s of sessions){
  obj(s,'session');arr(s.panes,'panes',2);if(!s.panes.length)fail('no pane');const paneIds=new Set(),viewIds=new Set();
  for(const pane of s.panes){
   id(pane.id,'pane ID');if(paneIds.has(pane.id))fail('duplicate pane');paneIds.add(pane.id);arr(pane.views,'views',5);
   if(pane.readerChromeCollapsed!==undefined)bool(pane.readerChromeCollapsed,'reader chrome');
   if(pane.companionUi!==undefined){obj(pane.companionUi,'companion UI');if(Object.keys(pane.companionUi).length>500)fail('too many companion preferences');for(const [key,ui] of Object.entries(pane.companionUi)){
    str(key,'companion preference key',400);obj(ui,'companion preference');for(const k of Object.keys(ui))if(!['open','collapsed','tab','term','query'].includes(k))fail('unknown companion preference');
    if(ui.open!==undefined)bool(ui.open,'companion open');if(ui.collapsed!==undefined){arr(ui.collapsed,'companion collapsed categories',500);ui.collapsed.forEach(x=>id(x,'companion category'));}
    if(ui.tab!==undefined&&!['overview','pages','glossary','search'].includes(ui.tab))fail('companion tab');if(ui.term!==undefined)str(ui.term,'companion term',180);if(ui.query!==undefined)str(ui.query,'companion query',300);
   }}
   for(const v of pane.views){id(v.id,'view ID');if(viewIds.has(v.id))fail('duplicate view');viewIds.add(v.id);arr(v.history,'history',10000);int(v.cursor,'history cursor',0,Math.max(0,v.history.length-1));bool(v.english,'English visibility');
    for(const key of ['collapsed','revealed']){obj(v[key],key);for(const [bid,state] of Object.entries(v[key])){id(bid,'disclosure block');bool(state,'disclosure');}}
    for(const l of v.history){id(l.pageId,'history page');if(l.collectionId!==undefined){id(l.collectionId,'collection ID');if(l.pageId!==l.collectionId)fail('collection navigation identity');}
     if(!['continuous','book','parallel'].includes(l.presentation))fail('presentation');if(!['single','continuous','spread','grid'].includes(l.pdfMode))fail('PDF mode');
     if(l.previousPresentation!==undefined&&!['continuous','parallel'].includes(l.previousPresentation))fail('previous note layout');if(l.previousPdfMode!==undefined&&!['single','continuous','spread','grid'].includes(l.previousPdfMode))fail('previous PDF layout');
     if(l.previousGridMode!==undefined&&!['single','continuous','spread'].includes(l.previousGridMode))fail('previous grid layout');if(l.previousGridZoom!==undefined)num(l.previousGridZoom,'previous grid zoom',0.1,10);
     if(l.sheetPage!==undefined)int(l.sheetPage,'cheatsheet page',1,64);if(l.sheetMode!==undefined&&!['single','spread','grid'].includes(l.sheetMode))fail('cheatsheet mode');if(l.sheetZoom!==undefined)num(l.sheetZoom,'cheatsheet zoom',0.25,4);if(l.sheetFit!==undefined&&!['page','width'].includes(l.sheetFit))fail('cheatsheet fit');int(l.pdfPage,'PDF page',1,1000000);num(l.zoom,'zoom',0.1,10);if(![0,90,180,270].includes(l.rotation))fail('rotation');bool(l.cover,'cover');anchor(l.anchor);if(l.scroll!==undefined)num(l.scroll,'scroll');
    }
   }
   if(pane.views.length&&!pane.views.some(v=>v.id===pane.active))fail('active view missing');if(!pane.views.length&&pane.active!=='')fail('empty active view');
  }
  if(!paneIds.has(s.activePane))fail('active pane missing');num(s.ratio,'split ratio',28,72);num(s.fontSize,'font size',14,22);if(!['home','reader','bookmarks'].includes(s.screen))fail('screen');if(!['fluent','neutral','academic','lavender','slate'].includes(s.theme))fail('theme');if(s.libraryMode!==undefined&&!['notes','pdfs','cheatsheets','articles','qcm'].includes(s.libraryMode))fail('library mode');
  if(s.surface!==undefined&&!['dashboard','library'].includes(s.surface))fail('app surface');if(s.dashboardSubject!==undefined)validateTaxonomy({subject:s.dashboardSubject});for(const key of ['dashboardFolder','dashboardItemId','libraryFolder'])if(s[key]!==undefined)id(s[key],key);
  if(s.typeExpanded!==undefined){obj(s.typeExpanded,'type expansion');for(const [key,ids]of Object.entries(s.typeExpanded)){if(!['notes','pdfs','cheatsheets','articles','qcm'].includes(key))fail('expansion type');arr(ids,'expanded folders',5000);ids.forEach(x=>id(x,'folder ID'));}}
  for(const key of ['leftOpen','rightOpen','focus','showFlags'])bool(s[key],key);arr(s.expanded,'expanded IDs');s.expanded.forEach(x=>id(x,'expanded ID'));
  if(s.categoryFilter!==undefined&&s.categoryFilter!==null&&!['informatics','cloud','norsk','job','personal'].includes(s.categoryFilter))fail('category filter');
  if(s.pdfTreeExpanded!==undefined){arr(s.pdfTreeExpanded,'PDF tree disclosures',2000);s.pdfTreeExpanded.forEach(x=>str(x,'PDF tree key',800));if(new Set(s.pdfTreeExpanded).size!==s.pdfTreeExpanded.length)fail('duplicate PDF tree key');}
  if(s.compactTop!==undefined)bool(s.compactTop,'compact top');if(s.collapsedGroups!==undefined){arr(s.collapsedGroups,'collapsed groups',1000);s.collapsedGroups.forEach(x=>id(x,'collapsed group'));}
  if(s.collapsedPane!=null&&(s.panes.length!==2||!paneIds.has(s.collapsedPane)||s.activePane===s.collapsedPane))fail('collapsed pane');
 }
 return true;
}
