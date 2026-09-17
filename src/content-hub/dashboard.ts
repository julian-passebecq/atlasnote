import type {Catalogue,Workspace} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
import type {SubjectKey,TaxonomyRef} from './model.js';
import {subjectFromCategory} from './model.js';
import {bookmarkTarget} from '../core/reading-lists.js';
import {isArchived} from '../core/workspace.js';
import {targetTaxonomy,resourceTaxonomy,sharedFolders,scopeMatches} from './taxonomy.js';
export const DASHBOARD_ROWS=['Inbox','To-do','Quick notes','Bookmarks','Read later'] as const;
export type DashboardRow=typeof DASHBOARD_ROWS[number];
export type DashboardCard={id:string;title:string;row:DashboardRow;target:ReadingTarget;taxonomy?:TaxonomyRef;source?:ReadingTarget;url?:string;important?:boolean;dueAt?:number;done?:boolean;capture?:string;article?:string;note?:string};
/** Derived view; bookmarks/read-later/article-inbox are never copied into a Dashboard store. */
export function dashboardCards(c:Catalogue,ws:Workspace,includeDone=false):DashboardCard[]{
 const cards:DashboardCard[]=[];
 for(const i of ws.personal.dashboardItems??[]){if(i.status==='archived'||i.status==='done'&&!includeDone)continue;cards.push({id:i.id,title:i.text,row:i.kind==='task'?'To-do':i.kind==='note'?'Quick notes':'Inbox',target:{kind:'dashboard-item',itemId:i.id},taxonomy:i.taxonomy,source:i.contextTarget,url:i.url,important:i.important,dueAt:i.dueAt,done:i.status==='done',capture:i.id});}
 for(const p of c.pages)if(p.article&&(p.article.status??'inbox')==='inbox'&&!isArchived(p.id,c,ws.overlays)){const a=p.article;cards.push({id:'article.'+a.id,title:a.title,row:'Inbox',target:{kind:'article',articleId:a.id,pageId:p.id},taxonomy:resourceTaxonomy(c,ws.overlays,p.id),source:a.contextTarget,url:a.url,important:a.important,article:p.id,note:a.note});}
 for(const b of ws.personal.bookmarks){const target=bookmarkTarget(b),subject=subjectFromCategory(b.category??undefined);cards.push({id:'bookmark.'+b.id,title:b.title,row:'Bookmarks',target,taxonomy:targetTaxonomy(c,ws,target)??(subject?{subject}:undefined),note:b.note});}
 for(const r of ws.personal.readLater??[]){if(r.read&&!includeDone)continue;const subject=subjectFromCategory(r.category??undefined);cards.push({id:'later.'+r.id,title:r.title,row:'Read later',target:r.target,taxonomy:targetTaxonomy(c,ws,r.target)??(subject?{subject}:undefined),url:r.target.kind==='url'?r.target.url:undefined,note:r.note,done:r.read});}
 return cards;
}
export function filterDashboard(cards:DashboardCard[],c:Catalogue,ws:Workspace,subject?:SubjectKey,folderId?:string){const folders=sharedFolders(c,ws.overlays);return cards.filter(card=>scopeMatches(card.taxonomy,subject,folderId,folders));}
