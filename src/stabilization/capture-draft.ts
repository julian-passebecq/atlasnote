import type {CaptureRow} from '../content-hub/content.js';
import type {TaxonomyRef,ArticleSource} from '../content-hub/model.js';
/** Returning to Capture makes its current opt-in choices authoritative. */
export function resumeArticleDraft(previous:Partial<ArticleSource>|undefined,source:Partial<ArticleSource>):Partial<ArticleSource>{
 const {contextTarget,taxonomy,...body}=previous??{};
 return {...body,...source};
}
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
