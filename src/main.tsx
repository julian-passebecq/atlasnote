/** Unit-only backend for the public orchestrator. This is not IndexedDB/browser
 * evidence. Production atomicity is separately exercised by v22_runtime.py. */
import {configureAgentInterface} from './agent/service.js';
import React,{ReactDOM} from './vendor/react.mjs';
import {loadShell,store} from './storage/database.js';
import {App} from './app/App.js';
const mark=(name:string)=>{try{performance.mark('atlas:boot:'+name);}catch{}};
/** V3 staged boot. The first render needs only the reviewed catalogue and the
 * shell read (imports, overlays, personal, history heads). Asset bytes and the
 * full revision store hydrate afterwards; authored/history/backup commands wait
 * for that complete state, so nothing partial reaches the durable writers. */
async function main(){
 mark('start');
 const r=await fetch(new URL('content.json',document.baseURI));if(!r.ok)throw Error('The reviewed content catalogue could not be loaded.');const built=await r.json();mark('catalogue');
 store.configure(built);store.beginStagedBoot();
 let shellOk=true;try{store.setShell(await loadShell());}catch(e){shellOk=false;store.fail(e);store.markFailed(e);}mark('shell');
 configureAgentInterface(built);
 ReactDOM.createRoot(document.getElementById('root')!).render(<App built={built}/>);
 requestAnimationFrame(()=>mark('first-render'));
 if(!shellOk)return;
 try{await store.hydrate();mark('hydrated');await store.initializeHistory(built);mark('reconciled');store.markReady();mark('ready');}
 catch(e){store.markFailed(e);store.fail(e);}
}
main().catch(e=>{const root=document.getElementById('root')!;root.textContent='Knowledge Atlas could not start: '+e.message+'. Serve the extracted build over localhost or HTTPS; do not open index.html as a file.';});
