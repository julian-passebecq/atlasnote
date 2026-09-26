/** Discrete page-turn gesture gate. Native mid-page and continuous scrolling
 * remain native. Small, deliberate edge ticks accumulate longer than the burst
 * debounce; a continuous momentum burst still turns at most one page. */
export function createWheelPager({threshold=90,idle=220,cooldown=500,accumulationWindow=1200}={}){
 let sum=0,direction=0,last=-Infinity,turned=false,lastTurn=-Infinity,turnDirection=0;
 let reverseSum=0,reverseTicks=0,detents=0,previousMagnitude=0;
 const step=function({deltaY,deltaX=0,deltaMode=0,now,mode,top,bottom,blocked=false}){
  if(!Number.isFinite(now)||!Number.isFinite(deltaY)||!Number.isFinite(deltaX))return 0;
  const gap=now-last;
  if(gap>idle){turned=false;reverseSum=0;reverseTicks=0;detents=0;}
  // The old implementation cleared sub-threshold ticks after only 220ms,
  // preventing slow mouse-wheel users from ever leaving the current page.
  if(gap>accumulationWindow){sum=0;direction=0;}
  last=now;
  if(blocked||mode==='continuous'||Math.abs(deltaX)>Math.abs(deltaY)||!deltaY){sum=0;direction=0;detents=0;reverseSum=0;reverseTicks=0;return 0;}
  const sign=Math.sign(deltaY);
  const magnitude=Math.abs(deltaY)*(deltaMode===1?16:deltaMode===2?800:1);
  const cadence=gap>=80&&gap<=idle&&magnitude>=60&&Math.abs(magnitude-previousMagnitude)<=Math.max(4,magnitude*0.08);
  previousMagnitude=magnitude;
  if(direction!==sign){direction=sign;sum=0;reverseSum=0;reverseTicks=0;detents=0;}
  if(!(sign>0?bottom:top)){sum=0;reverseSum=0;reverseTicks=0;detents=0;return 0;}
  if(now-lastTurn<cooldown)return 0;
  if(turned){
   // A substantial, repeated opposite intent is not a one-pixel inertial wobble.
   if(sign!==turnDirection){reverseSum+=magnitude;reverseTicks++;if(reverseTicks<2||reverseSum<threshold)return 0;}
   // Three stable, separated detents form a new intent. Fast momentum and its
   // decreasing low-amplitude tail keep the original one-turn-per-burst guard.
   // This is a gesture rule, NOT a claim to identify physical mouse hardware.
   else{detents=cadence?detents+1:0;if(detents<3)return 0;}
   turned=false;sum=threshold;detents=0;reverseSum=0;reverseTicks=0;
  }else sum+=magnitude;
  if(sum<threshold)return 0;
  sum=0;turned=true;lastTurn=now;turnDirection=sign;return sign;
 };
 // The engine consumes the remainder of a completed gesture while restoring
 // the new physical page. The idle/cooldown thresholds above are unchanged.
 step.isLatched=()=>turned;
 step.reset=()=>{sum=0;direction=0;last=-Infinity;turned=false;lastTurn=-Infinity;turnDirection=0;reverseSum=0;reverseTicks=0;detents=0;previousMagnitude=0;};
 return step;
}

/** Consume only the unfinished physical-page restore, never a rendered page's
 * remaining scroll range. The pager's latch separately prevents a second turn. */
export function consumeWheelRestore({mode,pendingTurn,pendingRestore}){
 return mode!=='continuous'&&pendingTurn&&pendingRestore;
}
/** Physical content boundary, measured BEFORE this wheel event. A large delta
 * may reach the edge natively; it cannot also turn a page during that event. */
export function wheelBoundaries(scrollTop,clientHeight,scrollHeight){
 return {top:scrollTop<=2,bottom:scrollTop+clientHeight>=scrollHeight-2};
}
