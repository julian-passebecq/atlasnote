import {allSessions} from './workspace-slots.js';
import type {Anchor,Personal,Remark} from './model.js';
/** A missing revision is absence, not an own property containing undefined.
 * IndexedDB preserves that property, JSON cannot: 1.2 backups differed exactly. */
export function pdfAnchor(pdfPage:number,pdfRevision?:string):Anchor {
 return {pdfPage,...(pdfRevision!==undefined?{pdfRevision}:{})};
}
export function makeRemark(text:string,pageId:string,updatedAt:number,revision?:string,anchor?:Anchor):Remark {
 return {text,pageId,updatedAt,...(revision!==undefined?{revision}:{}),...(anchor!==undefined?{anchor}: {})};
}
/** Bounded repair of the absent optional properties written by 1.2.
 * No timestamps, anchors, modes, values or unknown fields are normalized away.
 * This happens at the ownership boundary, never in backup equality assertions. */
export function repairAbsentPersonalOptionals(personal:Personal):Personal {
 const out=structuredClone(personal);
 const absent=(object:any,keys:string[])=>{if(object)for(const key of keys)if(Object.hasOwn(object,key)&&object[key]===undefined)delete object[key];};
 const anchor=(a:Anchor|undefined)=>absent(a,['blockId','offset','unit','viewportOffset','atStart','pdfPage','pdfRevision','pdfOffset']);
 for(const note of Object.values(out.notes)){absent(note,['anchor','revision']);anchor(note.anchor);}
 for(const mark of out.bookmarks){absent(mark,['anchor']);anchor(mark.anchor);}
 const saved=out.savedStates?[...out.savedStates.entries,...Object.values(out.savedStates.safety)]:[];
 const savedSessions=saved.flatMap(e=>e.scope==='all'?[e.session,...Object.values(e.workspaceSlots)]:[e.session]);
 for(const session of [...allSessions(out),...savedSessions]){absent(session,['libraryMode']);
 for(const pane of session.panes)for(const view of pane.views)for(const loc of view.history){absent(loc,['anchor','scroll','collectionId']);anchor(loc.anchor);}
 }
 return out;
}
