/** Discrete page-turn gesture gate. Native mid-page and continuous scrolling
 * remain native. Small, deliberate edge ticks accumulate longer than the burst
 * debounce; a continuous momentum burst still turns at most one page. */
export function createWheelPager({threshold=90,idle=220,cooldown=500,accumulationWindow=1200}={}){
 let sum=0,direction=0,last=-Infinity,turned=false,lastTurn=-Infinity;
 return function step({deltaY,deltaX=0,deltaMode=0,now,mode,top,bottom,blocked=false}){
  if(!Number.isFinite(now)||!Number.isFinite(deltaY)||!Number.isFinite(deltaX))return 0;
  const gap=now-last;
  if(gap>idle)turned=false;
  // The old implementation cleared sub-threshold ticks after only 220ms,
  // preventing slow mouse-wheel users from ever leaving the current page.
  if(gap>accumulationWindow){sum=0;direction=0;}
  last=now;
  if(blocked||mode==='continuous'||Math.abs(deltaX)>Math.abs(deltaY)||!deltaY){sum=0;direction=0;return 0;}
  const sign=Math.sign(deltaY);
  if(direction!==sign){direction=sign;sum=0;}
  if(!(sign>0?bottom:top)){sum=0;return 0;}
  if(turned||now-lastTurn<cooldown)return 0;
  sum+=Math.abs(deltaY)*(deltaMode===1?16:deltaMode===2?800:1);
  if(sum<threshold)return 0;
  sum=0;turned=true;lastTurn=now;return sign;
 };
}
