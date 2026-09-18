import type {Anchor} from '../core/model.js';
import {visibleAnchor,scrollToAnchor} from './pagination.mjs';

const units=(host:HTMLElement)=>[...host.querySelectorAll<HTMLElement>('.sheet-body > [data-block-id], .continuous-content > [data-block-id]')];
function texts(root:Node){const result:Text[]=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n:Node|null;while(n=walker.nextNode())result.push(n as Text);return result;}
function textRect(el:HTMLElement,index:number){
 let remaining=Math.max(0,index);
 for(const n of texts(el)){
  if(remaining<n.length){const r=document.createRange();r.setStart(n,remaining);r.setEnd(n,Math.min(n.length,remaining+1));const rect=r.getBoundingClientRect();if(rect.height)return rect;}
  remaining-=n.length;
 }
 return el.getBoundingClientRect();
}
/** Capture a source unit plus a character/row offset, not a generated sheet number.
 * viewportOffset is presentation-only and preserves the line's exact visual position.
 */
export function captureReadingAnchor(host:HTMLElement):Anchor|undefined{
 const top=host.getBoundingClientRect().top,threshold=top+24;
 const el=units(host).find(n=>n.getBoundingClientRect().bottom>threshold);
 if(!el)return visibleAnchor(host);
 let offset=Number(el.dataset.offset??0),rect=el.getBoundingClientRect();
 if(el.dataset.kind==='paragraph'){
  const length=el.textContent?.length??0;let lo=0,hi=length;
  while(lo<hi){const mid=Math.floor((lo+hi)/2);if(textRect(el,mid).bottom<=threshold)lo=mid+1;else hi=mid;}
  offset+=lo;rect=textRect(el,lo);
 }else{
  const selector=el.dataset.kind==='code'?'.code-line':el.dataset.kind==='table'?'tbody > tr':el.dataset.kind==='list'?'li':null;
  if(selector){const rows=[...el.querySelectorAll<HTMLElement>(selector)],at=rows.findIndex(n=>n.getBoundingClientRect().bottom>threshold);if(at>=0){offset+=at;rect=rows[at].getBoundingClientRect();}}
 }
 return {blockId:el.dataset.blockId,unit:el.dataset.unit,offset,viewportOffset:rect.top-top,atStart:host.scrollTop<=0};
}
export function restoreReadingAnchor(host:HTMLElement,anchor?:Anchor){
 if(!anchor)return false;
 if(anchor.atStart){host.scrollTop=0;return true;}
 if(!anchor.unit)return scrollToAnchor(host,anchor);
 const candidates=units(host).filter(n=>n.dataset.blockId===anchor.blockId&&n.dataset.unit===anchor.unit);
 const el=candidates.find(n=>Number(n.dataset.offset??0)<=Number(anchor.offset??0)&&Number(n.dataset.end??Infinity)>Number(anchor.offset??0))??candidates[0];
 if(!el)return scrollToAnchor(host,anchor);
 const relative=Math.max(0,(anchor.offset??0)-Number(el.dataset.offset??0));let rect=el.getBoundingClientRect();
 if(el.dataset.kind==='paragraph')rect=textRect(el,relative);
 else {const selector=el.dataset.kind==='code'?'.code-line':el.dataset.kind==='table'?'tbody > tr':el.dataset.kind==='list'?'li':null;if(selector){const rows=el.querySelectorAll<HTMLElement>(selector);rect=rows[Math.min(rows.length-1,relative)]?.getBoundingClientRect()??rect;}}
 host.scrollTop=Math.max(0,host.scrollTop+rect.top-host.getBoundingClientRect().top-(anchor.viewportOffset??20));
 return true;
}
