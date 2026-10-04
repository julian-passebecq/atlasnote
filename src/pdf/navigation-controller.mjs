/** V3.1: a completion owns exactly one document/page/geometry intent.
 * The renderer cannot acquire ownership by finishing late. No DOM or persistence
 * here: the engine performs a write only after canApply succeeds. */
export function createNavigationController(clock=()=>performance.now()){
 let sequence=0,active=null,phase='idle';
 return {
  begin({documentKey,targetPage,geometryKey,offset=0,reason='location'}){
   if(!Number.isInteger(targetPage)||targetPage<1)throw Error('Invalid physical page intent');
   active=Object.freeze({id:++sequence,documentKey,targetPage,geometryKey,offset,reason,startedAt:clock()});
   phase='waiting-geometry';return active;
  },
  current:()=>active,
  canApply(token,{documentKey,targetPage,geometryKey}){
   return !!active&&active===token&&token.documentKey===documentKey&&token.targetPage===targetPage&&token.geometryKey===geometryKey;
  },
  finish(token){if(active!==token||!active)return false;active=null;phase='settled';return true;},
  cancel(reason='user'){if(active){active=null;sequence++;}phase=reason;},
  age(){return active?Math.max(0,clock()-active.startedAt):0;},
  state:()=>({phase,generation:sequence,pending:!!active}),
 };
}
/** Correct a geometry change without undoing intervening native scrolling. */
export function geometryCompensation(beforeTop,afterTop,beforeScroll,afterScroll){
 return afterTop-beforeTop+afterScroll-beforeScroll;
}
/** A stable per-page fallback, never the moving average of unrelated pages. */
export function physicalPageHeight(width,ratio=1.414,labels=true){
 return Math.ceil(width*ratio)+(labels?20:0);
}
