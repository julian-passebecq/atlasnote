import {readingTargetId} from './reading-types.js';
import {libraryModeForPage} from '../content-hub/content.js';
import {sheetPosition} from '../cheatsheets/content.mjs';
import type {Personal,Catalogue,Overlays,WorkspaceNumber,Session} from './model.js';
import type {ReadingTarget,ReadingDestination} from './reading-types.js';
import {activeSession,selectWorkspace,revealPane} from './workspace-slots.js';
import {blankPersonal,current,newView,navigate,locations,isArchived,findNode} from './workspace.js';
import {validateReadingTarget} from '../storage/reading-validation.mjs';
import {studyTreeKey} from '../companion/tree.js';
/** Validate the target and the capacity BEFORE any session or active-slot change. */
export function openReadingTarget(p:Personal,c:Catalogue,o:Overlays,target:ReadingTarget,destination:ReadingDestination):void{
 validateReadingTarget(target);if(target.kind==='url')throw Error('External addresses open only through an explicit link.');
 if(target.kind==='dashboard-item'){
  const item=p.dashboardItems?.find(x=>x.id===target.itemId);if(!item)throw Error('This capture is unavailable. The saved link is retained.');
  if(destination==='pane'||destination==='tab')throw Error('Capture items open in Dashboard. Choose Open here or a workspace.');
  if(typeof destination==='number')selectWorkspace(p,destination);const s=activeSession(p);s.surface='dashboard';s.dashboardItemId=item.id;delete s.dashboardSubject;delete s.dashboardFolder;if(item.taxonomy)s.dashboardSubject=item.taxonomy.subject;return;
 }
 const id=readingTargetId(target);
 if(target.kind==='collection'){if(!c.projects.some(x=>x.id===id)&&!findNode(c.projects,id))throw Error('The saved collection is unavailable. Import its library first.');}
 else if(!c.pages.some(x=>x.id===id))throw Error('The saved page is unavailable. Import its library first.');
 if(isArchived(id,c,o))throw Error('This saved item is archived. Restore it from library management first.');
 const page=c.pages.find(p=>p.id===id);
 if(target.kind==='article'&&page?.article?.id!==target.articleId)throw Error('The saved article is unavailable.');
 if(target.kind==='qcm'&&(page?.qcm?.id!==target.setId||target.questionId&&!page.qcm.questions.some(q=>q.id===target.questionId)))throw Error('The saved QCM question is unavailable. Your link is retained.');
 const sheet=page?.cheatsheet;
 if(target.kind==='cheatsheet-page'&&(!sheet||sheet.id!==target.documentId||!sheetPosition(sheet,{sheetPage:target.sheetPage,anchor:target.anchor}).available))throw Error('The saved physical cheatsheet page is unavailable. Your saved entry was retained.');
 if(target.kind==='page'&&(target.anchor?.sheetPage||target.anchor?.sheetId)&&(!sheet||!sheetPosition(sheet,{anchor:target.anchor}).available))throw Error('The saved cheatsheet page is unavailable.');
 const doc=c.documents.find(d=>d.pageId===id);
 if(target.kind==='page'&&target.anchor?.pdfRevision&&doc?.sha256!==target.anchor.pdfRevision)throw Error('This bookmark belongs to another PDF revision.');
 if(target.kind==='collection'){const node=findNode(c.projects,id);if(node&&[node.node.id,...node.ancestors].some(x=>o.archived.includes(x)))throw Error('The saved collection is archived.');}
 if(target.kind.startsWith('pdf-')){const t=target as Extract<ReadingTarget,{kind:'pdf-page'|'pdf-category'}>;if(!doc||doc.id!==t.documentId)throw Error('The saved PDF is unavailable.');if(t.revision&&doc.sha256!==t.revision)throw Error('This link belongs to another PDF revision. Your saved entry was retained.');if(doc.pageCount&&t.pdfPage>doc.pageCount)throw Error('This physical page is outside the PDF.');}
 const oldSlot=p.activeWorkspaceSlot??1,slot:WorkspaceNumber=typeof destination==='number'?destination:oldSlot;
 if(![1,2,3,4,5].includes(slot))throw Error('Workspace must be 1 to 5.');
 const s=slot===1?p.session:p.workspaceSlots?.[slot]??blankPersonal().session;
 const other=destination==='pane'?s.panes.find(x=>x.id!==s.activePane):undefined;
 const pane=other??s.panes.find(x=>x.id===s.activePane)??s.panes[0];
 const createPane=destination==='pane'&&!other;
 const newTab=destination==='tab'||destination==='pane'||typeof destination==='number';
 const empty=pane.views.find(v=>v.id===pane.active&&!current(v));
 if(!createPane&&newTab&&!empty&&pane.views.length>=5)throw Error('That pane already has five tabs. Close a tab or choose another workspace.');
 selectWorkspace(p,slot);const live=activeSession(p,slot);
 let dest=live.panes.find(x=>x.id===(other??pane).id)!;
 if(createPane){dest={id:live.panes[0].id==='left'?'right':'left',views:[],active:''};live.panes.push(dest);}
 const anchor=target.kind==='cheatsheet-page'?{...target.anchor,sheetPage:sheetPosition(sheet,{sheetPage:target.sheetPage,anchor:target.anchor}).page}:target.kind==='pdf-page'?{...target.anchor,pdfPage:target.pdfPage,...(target.revision?{pdfRevision:target.revision}:{})}:target.kind==='pdf-category'?{pdfPage:target.pdfPage,...(target.revision?{pdfRevision:target.revision}:{})}:target.kind==='page'||target.kind==='article'?target.anchor:target.kind==='qcm'&&target.questionId?{questionId:target.questionId}:undefined;
 const v=dest.views.find(v=>v.id===dest.active),reuse=!newTab||!!v&&!current(v);
 if(v&&reuse){dest.views[dest.views.indexOf(v)]=navigate(v,id,anchor);}else {const fresh=newView(id,anchor);dest.views.push(fresh);dest.active=fresh.id;}
 const loc=current(dest.views.find(v=>v.id===dest.active))!;if(target.kind==='collection')loc.collectionId=id;
 live.screen='reader';delete live.surface;revealPane(live,dest.id);if(target.kind!=='collection')live.libraryMode=libraryModeForPage(c,id);
 for(const branch of locations(c).get(id)?.ancestors??[])if(!live.expanded.includes(branch))live.expanded.push(branch);
 if(target.kind==='pdf-category'&&doc){const set=new Set(live.pdfTreeExpanded??[]);set.add(studyTreeKey(doc,'document'));set.add(studyTreeKey(doc,'category',target.pdfCategoryId));live.pdfTreeExpanded=[...set];}
}
