import type {ResourceRevision, AgentReviewRecord} from '../history/model.js';
export type RevisionIdentity = Omit<ResourceRevision, 'snapshot'> & {snapshot?:ResourceRevision['snapshot']};
export type BuildIdentity = {appVersion:string; sourceCommit:string; sourceHash:string; sourceDirty:boolean; databaseVersion:3; pdfAtlasCommit:string; buildKind:'integrated'|'compatibility'};
export type ArchiveAsset = {key:string; sha256:string; mediaType:string; bytes:number; path:string};
export type ArchiveRange = {resourceKey:string; previous:null|{archiveId:string; rootHash:string; lastRevisionId:string; lastNumber:number}; revisions:Omit<ResourceRevision,'snapshot'>[]};
export type ArchiveDescriptor = {kind:'archive'; schemaVersion:1; archiveSchema:1; archiveId:string; rootHash:string; createdAt:number; provenance:BuildIdentity; sourceEpoch:number; sourceHistoryHash:string; ranges:ArchiveRange[]; assets:ArchiveAsset[]; reviews:Omit<AgentReviewRecord,'plan'|'selectedOperationIds'|'reason'>[]; counts:{revisions:number; reviews:number; assets:number; assetBytes:number; structuredBytes:number}};
export type VerifiedArchive = {descriptor:ArchiveDescriptor; ancestors:ArchiveDescriptor[]; revisions:ResourceRevision[]; reviews:AgentReviewRecord[]; assets:import('../core/model.js').Asset[]; bytes:Uint8Array; fileHash:string};
