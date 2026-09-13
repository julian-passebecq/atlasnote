export type PdfCategory={id:string;title:string;pageRefs?:number[];pageRanges?:[number,number][];children?:PdfCategory[]};
export type PdfTerm={id:string;label:string;definition:string;aliases?:string[];translation?:string;example?:string;importance?:'core'|'supporting'|'detail';pageRefs:number[];categoryIds?:string[];globalTermId?:string};
export type PdfPageCompanion={page:number;title?:string;summary?:string;keyPoints?:string[];categoryIds?:string[];termIds?:string[]};
export type PdfCompanion={schemaVersion:1;id:string;documentId:string;documentSha256?:string;pageCount:number;title:string;generatedBy?:'ai'|'manual';createdAt:number;reviewed?:boolean;categories:PdfCategory[];pages:Record<string,PdfPageCompanion>;terms:PdfTerm[]};
