/** Local, lifetime-scoped bridge to the already open PDF engine. No PDF is
 * fetched or opened just to populate the sidebar or show the metadata editor. */
export type StudyPreparer=(first:number,last:number,progress:(n:number,last:number)=>void,signal:AbortSignal)=>Promise<any>;
const preparers=new Map<string,StudyPreparer>();
const key=(slot:number,pane:string,doc:string)=>JSON.stringify([slot,pane,doc]);
export function registerStudyPreparer(slot:number,pane:string,doc:string,fn:StudyPreparer){const k=key(slot,pane,doc);preparers.set(k,fn);return()=>{if(preparers.get(k)===fn)preparers.delete(k);};}
export function prepareOpenPdf(slot:number,pane:string,doc:string):StudyPreparer{return (...args)=>{const fn=preparers.get(key(slot,pane,doc));if(!fn)return Promise.reject(Error('Open this PDF and wait for it to finish loading before extracting text.'));return fn(...args);};}
