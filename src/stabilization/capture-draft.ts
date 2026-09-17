import type {CaptureRow} from '../content-hub/content.js';
import type {TaxonomyRef} from '../content-hub/model.js';
export type CaptureDraft={mode:'link'|'task'|'note';rows:CaptureRow[];taxonomy?:TaxonomyRef;attach:boolean};
export const emptyCaptureRow=():CaptureRow=>({text:'',url:'',due:'',important:false});
export function newCaptureDraft(mode:CaptureDraft['mode']='link'):CaptureDraft{return {mode,rows:Array.from({length:3},emptyCaptureRow),attach:false};}
export function removeDraftRow(draft:CaptureDraft,index:number):CaptureDraft{
 if(draft.rows.length<=3)return draft;
 return {...draft,rows:draft.rows.filter((_,i)=>i!==index)};
}
export function appendDraftRow(draft:CaptureDraft):CaptureDraft{
 if(draft.rows.length>=5)return draft;
 return {...draft,rows:[...draft.rows,emptyCaptureRow()]};
}
