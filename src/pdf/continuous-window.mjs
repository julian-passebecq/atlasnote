/** V3 bounded Continuous PDF rendering. Small PDFs keep the original all-pages
 * DOM exactly. Long PDFs render only a window of physical-page wrappers around
 * the reader's page; the pages outside it are represented by two spacers whose
 * heights use MEASURED wrapper heights (falling back to the measured average,
 * then a ratio estimate) plus the container's real row gap, so the scroll
 * geometry stays continuous when pages enter or leave the window. */
export const WINDOW_THRESHOLD=40;
export function continuousWindow(page,count,radius=8,threshold=WINDOW_THRESHOLD){
 if(!Number.isInteger(count)||count<1)return {first:1,last:0,windowed:false};
 if(count<=threshold)return {first:1,last:count,windowed:false};
 const p=Math.min(Math.max(1,Math.round(page)||1),count),r=Math.max(2,Math.round(radius));
 let first=Math.max(1,p-r),last=Math.min(count,p+r);
 // Keep a constant window size at the ends of the document.
 if(first===1)last=Math.min(count,1+2*r);if(last===count)first=Math.max(1,count-2*r);
 return {first,last,windowed:true};
}
export function estimateHeight(heights,fallback){
 let sum=0,n=0;for(const h of heights.values())if(h>0){sum+=h;n++;}
 return n?sum/n:fallback;
}
/** Total height occupied by pages from..to (inclusive), including the gaps
 * BETWEEN them. The gap separating the spacer from its neighbour already
 * exists in the flex container, so it is not added here. */
export function spacerHeight(from,to,heights,estimate,gap){
 if(to<from)return 0;let h=0;for(let n=from;n<=to;n++)h+=heights.get(n)??estimate;
 return Math.round(h+(to-from)*gap);
}
/** Physical page and intra-page fraction for an offset measured from the top
 * of the page `from` (e.g. inside a spacer). */
export function pageAtOffset(offset,from,to,heights,estimate,gap){
 let top=0;for(let n=from;n<=to;n++){const h=heights.get(n)??estimate;if(offset<top+h+gap||n===to)return {page:n,fraction:Math.max(0,Math.min(1,(offset-top)/(h||1)))};top+=h+gap;}
 return {page:Math.max(from,to),fraction:0};
}
/** Radius large enough to cover several viewports of the current page size. */
export function windowRadius(viewportHeight,pageHeight){
 const perViewport=Math.ceil((viewportHeight||800)/Math.max(40,pageHeight||800));
 return Math.max(6,perViewport*3);
}
