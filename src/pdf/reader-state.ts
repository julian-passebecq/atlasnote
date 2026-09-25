/** V3 runtime PDF reader state shared by the reader controller and the study
 * tree. Keyed by workspace slot + pane. It is display state only: never written
 * to IndexedDB, backups or history, and never used to rewrite authored metadata.
 * The verified count comes from the opened bytes (PDF.js numPages) and is keyed
 * by document ID + byte SHA, so a stale metadata pageCount cannot disagree with
 * the reader while that exact file is open. */
export type ReaderPosition={slot:number;paneId:string;documentId:string;sha256?:string;page:number;visible:number[];numPages:number};
const positions=new Map<string,ReaderPosition>(),verified=new Map<string,number>(),listeners=new Set<()=>void>();
let version=0;
const key=(slot:number,paneId:string)=>slot+':'+paneId;
const docKey=(documentId:string,sha256?:string)=>documentId+'@'+(sha256??'');
function changed(){version++;listeners.forEach(fn=>fn());}
export const subscribeReaderState=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const readerStateVersion=()=>version;
export function publishPosition(p:ReaderPosition){
 const old=positions.get(key(p.slot,p.paneId));
 if(old&&old.documentId===p.documentId&&old.sha256===p.sha256&&old.page===p.page&&old.numPages===p.numPages&&old.visible.join()===p.visible.join())return;
 positions.set(key(p.slot,p.paneId),{...p,visible:[...p.visible]});changed();
}
export function clearPosition(slot:number,paneId:string,documentId?:string){
 const old=positions.get(key(slot,paneId));if(!old||documentId&&old.documentId!==documentId)return;
 positions.delete(key(slot,paneId));changed();
}
export function positionsForDocument(slot:number,documentId:string,sha256?:string):ReaderPosition[]{
 return [...positions.values()].filter(p=>p.slot===slot&&p.documentId===documentId&&(p.sha256??'')===(sha256??''));
}
export function publishVerifiedCount(documentId:string,sha256:string|undefined,numPages:number){
 if(!Number.isInteger(numPages)||numPages<1||verified.get(docKey(documentId,sha256))===numPages)return;
 verified.set(docKey(documentId,sha256),numPages);changed();
}
export function verifiedPageCount(documentId:string,sha256?:string):number|undefined{return verified.get(docKey(documentId,sha256));}
