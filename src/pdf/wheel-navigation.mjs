/** Discrete page-turn gesture gate. Native mid-page/continuous scrolling is
 * untouched; a continuous trackpad burst cannot flip multiple pages. */
export function createWheelPager({threshold=90,idle=220,cooldown=500}={}){
 let sum=0,direction=0,last=-Infinity,turned=false,lastTurn=-Infinity;
 return function step({deltaY,deltaX=0,deltaMode=0,now,mode,top,bottom,blocked=false}){
  if(now-last>idle){sum=0;direction=0;turned=false;}
  last=now;
  if(blocked||mode==='continuous'||Math.abs(deltaX)>Math.abs(deltaY)||!deltaY){sum=0;return 0;}
  const sign=Math.sign(deltaY);
  if(direction!==sign){direction=sign;sum=0;}
  if(!(sign>0?bottom:top)){sum=0;return 0;}
  if(turned||now-lastTurn<cooldown)return 0;
  sum+=Math.abs(deltaY)*(deltaMode===1?16:deltaMode===2?800:1);
  if(sum<threshold)return 0;
  sum=0;turned=true;lastTurn=now;return sign;
 };
}
