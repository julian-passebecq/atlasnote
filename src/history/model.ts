import type {Page,Project,DocumentEntry} from '../core/model.js';
import type {TaxonomyRef,NotebookReference} from '../content-hub/model.js';
export type ResourceType='notebook-page'|'notebook-tree'|'article'|'cheatsheet'|'qcm'|'pdf';
export type RevisionSource='manual'|'ai'|'import'|'restore'|'migration'|'system';
export type PdfProvenance={logicalDocumentId:string;repository?:string;commit?:string;relativePath?:string;sha256?:string;bytes?:number;pageCount?:number;metadataRevision:string;rights:DocumentEntry['rights']};
export type AssetReference={key:string;sha256:string;mediaType:string};
export type ResourceSnapshot={assetRefs?:Record<string,AssetReference>;companion?:import('../companion/model.js').PdfCompanion|null;page?:Page;project?:Project;document?:DocumentEntry;taxonomy?:TaxonomyRef|null;references?:NotebookReference[];category?:string|null;archived?:string[];preferences?:Record<string,unknown>;pdfProvenance?:PdfProvenance};
export type ResourceRevision={kind:'revision';schemaVersion:1;revisionId:string;resourceKey:string;resourceId:string;resourceType:ResourceType;number:number;parentRevisionId:string|null;createdAt:number;source:RevisionSource;summary:string;status:'committed';contentHash:string;snapshot:ResourceSnapshot;restoredFromRevisionId?:string;derivedFromRevisionId?:string;sourceDetail?:string;changeSetId?:string};
export type ResourceHead={kind:'head';schemaVersion:1;resourceKey:string;revisionId:string;number:number;contentHash:string};
export type HistoryMeta={kind:'meta';schemaVersion:1;epoch:number;initialized:boolean;baselineRelease:string;baselineCommit:string};
export type AgentReviewRecord={kind:'review';schemaVersion:1;id:string;status:'staged'|'accepted'|'rejected'|'stale';createdAt:number;decidedAt?:number;plan:unknown;selectedOperationIds?:string[];reason?:string;revisionIds?:string[]};
export type HistoryData={schemaVersion:1;meta:HistoryMeta;heads:ResourceHead[];revisions:ResourceRevision[];reviews:AgentReviewRecord[]};
export type RevisionContext={source:RevisionSource;summary?:string;sourceDetail?:string;changeSetId?:string;restoredFromRevisionId?:string;derivedFromRevisionId?:string;forceResourceKey?:string;forceResourceKeys?:string[];restoredFromRevisions?:Record<string,string>};
export type CapturedResource={resourceKey:string;resourceId:string;resourceType:ResourceType;snapshot:ResourceSnapshot};
export const BASELINE_COMMIT='b50c27a987fa65eee1c51d36225908621e322da7';
export function emptyHistory():HistoryData{return {schemaVersion:1,meta:{kind:'meta',schemaVersion:1,epoch:0,initialized:false,baselineRelease:'2.1.0',baselineCommit:BASELINE_COMMIT},heads:[],revisions:[],reviews:[]};}
