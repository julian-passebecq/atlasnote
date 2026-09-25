import type {Anchor,Block} from '../core/model.js';
import type {ReadingTarget} from '../core/reading-types.js';
export type LibraryMode='notes'|'pdfs'|'cheatsheets'|'articles'|'qcm';
export type SubjectKey='it'|'cloud'|'job'|'kpi'|'norsk';
export type TaxonomyRef={subject:SubjectKey;folderId?:string;path?:string[]};
export type ArticleMeta={id:string;title:string;url?:string;publisher?:string;sourceType?:'link'|'article'|'transcript'|'documentation';taxonomy?:TaxonomyRef;status?:'inbox'|'unread'|'reading'|'finished';important?:boolean;note?:string;addedAt:number;updatedAt?:number;contextTarget?:ReadingTarget};
export type ArticleSource=Omit<ArticleMeta,'addedAt'> & {addedAt?:number;text?:string;blocks?:Block[]};
export type QcmOption={id:string;text:string;explanation?:string};
export type QcmQuestion={id:string;prompt:string;options:QcmOption[];correctOptionIds:string[];explanation?:string;followUp?:string;tags?:string[];links?:{label:string;target:ReadingTarget}[]};
export type QcmDocument={schemaVersion:1;id:string;title:string;taxonomy?:TaxonomyRef;questions:QcmQuestion[]};
export type QcmAttempt={id:string;setId:string;questionId:string;selectedOptionIds:string[];correct:boolean;answeredAt:number;attemptNumber:number;reflection?:string;revealed?:boolean};
export type QcmResponse={setId:string;questionId:string;selectedOptionIds:string[];reflection:string;updatedAt:number};
export type DashboardItem={id:string;kind:'link'|'task'|'note'|'article-draft';text:string;url?:string;dueAt?:number;important?:boolean;status?:'inbox'|'open'|'done'|'archived';taxonomy?:TaxonomyRef;contextTarget?:ReadingTarget;createdAt:number;updatedAt?:number;origin?:ExternalOrigin};
/** Non-secret provenance of an item imported through a reviewed handoff. */
export type ExternalOrigin={app:'powerops';objectId:string;revision?:string;projectRef?:string;importedAt:number;fingerprint?:string};
export type NotebookReference={id:string;title:string;target:ReadingTarget;taxonomy:TaxonomyRef;createdAt:number};
export type TaxonomyFolder={id:string;projectId:string;parentId?:string;title:string;path:string[];subject:SubjectKey};
export const LIBRARY_TYPES:{id:LibraryMode;label:string;icon:string;add:string}[]=[
 {id:'notes',label:'Notebook',icon:'book',add:'New notebook'}, {id:'pdfs',label:'PDF',icon:'pdf',add:'Add PDF'},
 {id:'cheatsheets',label:'Cheatsheet',icon:'grid',add:'New/import cheatsheet'}, {id:'articles',label:'Article',icon:'page',add:'Add article'}, {id:'qcm',label:'QCM',icon:'help',add:'New/import QCM'}
];
export const SUBJECT_COMPAT={it:'informatics',cloud:'cloud',job:'job',kpi:'personal',norsk:'norsk'} as const;
export const SUBJECTS:{id:SubjectKey;label:string}[]=[{id:'it',label:'IT'},{id:'cloud',label:'Cloud'},{id:'job',label:'Job'},{id:'kpi',label:'KPI'},{id:'norsk',label:'Norsk'}];
export const subjectFromCategory=(id?:string|null):SubjectKey|undefined=>SUBJECTS.find(s=>SUBJECT_COMPAT[s.id]===id)?.id;
