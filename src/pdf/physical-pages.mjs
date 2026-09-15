export function clampPage(page,total){return Math.max(1,Math.min(Math.max(1,total),Math.floor(Number(page)||1)));}
export function groupedPages(page,total,size=2,cover=false){
 if(!Number.isInteger(total)||total<1)return [];
 const n=clampPage(page,total);if(cover&&n===1)return [1];
 const offset=cover?2:1,start=offset+Math.floor((n-offset)/size)*size;
 return Array.from({length:size},(_,i)=>start+i).filter(x=>x>=1&&x<=total);
}
export function spreadPages(page,total,cover=false){return groupedPages(page,total,2,cover);}
export function gridPages(page,total,cover=false){return groupedPages(page,total,4,cover);}
export function combinedRotation(intrinsic,viewer){return ((intrinsic+viewer)%360+360)%360;}
/** Boolean paired is retained for callers of the original two-page API.
 * @param {boolean|number} paired */
export function stepPhysicalPage(page,total,direction,paired=false,cover=false){
 const size=paired===4?4:paired?2:1,shown=groupedPages(page,Math.max(1,total),size,cover&&size>1);
 const requested=direction>0?shown[shown.length-1]+1:shown[0]-1,next=clampPage(requested,total);
 return size>1?groupedPages(next,Math.max(1,total),size,cover)[0]:next;
}
/** Largest uniform width that fits two columns and two rows, using actual
 * rotated page ratios. No bitmap rescaling, stretching, or invented pages. */
export function gridPageWidth(width,height,ratios,labels=true){
 const rows=[Math.max(...ratios.slice(0,2),0),Math.max(...ratios.slice(2,4),0)].filter(x=>x>0);
 if(!rows.length)return Math.max(32,(width-48)/2);
 const byWidth=(width-44)/2,byHeight=(height-24-(rows.length-1)*12-(labels?20*rows.length:0))/rows.reduce((a,b)=>a+b,0);
 return Math.max(32,Math.floor(Math.min(byWidth,byHeight)));
}
