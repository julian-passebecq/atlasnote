/** Progressive enhancement, no browser-fullscreen state is persisted.
 * enter() must be called synchronously by the Focus activation handler.
 * Rejections retain CSS Focus; external/fullscreen exits only affect our root. */
export function createFullscreenController(root:HTMLElement,doc:Document,onExit:()=>void){
 let wanted=false,owned=false,disposed=false;
 function exit(){
  wanted=false;
  if(doc.fullscreenElement!==root||!doc.exitFullscreen)return;
  try{void Promise.resolve(doc.exitFullscreen()).catch(()=>{});}catch{/* CSS Focus still exits. */}
 }
 function changed(){
  if(doc.fullscreenElement===root){owned=true;if(!wanted||disposed)exit();}
  else if(owned){owned=false;wanted=false;if(!disposed)onExit();}
 }
 doc.addEventListener('fullscreenchange',changed);
 return {
  enter(){
   if(disposed)return;wanted=true;
   if(!root.requestFullscreen||doc.fullscreenElement&&doc.fullscreenElement!==root)return;
   try{void Promise.resolve(root.requestFullscreen()).then(()=>{
    // A rapid second click/programmatic exit may win before the grant arrives.
    if(!wanted||disposed)exit();else if(doc.fullscreenElement===root)owned=true;
   }).catch(()=>{/* Unsupported/denied API is the ordinary CSS Focus fallback. */});}catch{/* Older implementations can throw synchronously. */}
  },
  exit,
  dispose(){disposed=true;doc.removeEventListener('fullscreenchange',changed);exit();}
 };
}
