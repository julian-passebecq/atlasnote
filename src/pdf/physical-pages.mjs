export function clampPage(page,total){return Math.max(1,Math.min(Math.max(1,total),Math.floor(Number(page)||1)));}
export function spreadPages(page,total,cover=false){const n=clampPage(page,total);if(cover&&n===1)return [1];const start=cover?2+Math.floor((n-2)/2)*2:1+Math.floor((n-1)/2)*2;return [start,start+1].filter(x=>x<=total);}
export function combinedRotation(intrinsic,viewer){return ((intrinsic+viewer)%360+360)%360;}

/** Navigate by the actual visible spread, including a standalone cover. */
export function stepPhysicalPage(page,total,direction,paired=false,cover=false){
 const shown=paired?spreadPages(page,total,cover):[clampPage(page,total)];
 const requested=direction>0?shown[shown.length-1]+1:shown[0]-1;
 const next=clampPage(requested,total);
 return paired?spreadPages(next,total,cover)[0]:next;
}
