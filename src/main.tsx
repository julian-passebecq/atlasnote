import React,{ReactDOM} from './vendor/react.mjs';
import {loadWorkspace,store} from './storage/database.js';
import {App} from './app/App.js';
async function main(){const r=await fetch(new URL('content.json',document.baseURI));if(!r.ok)throw Error('The reviewed content catalogue could not be loaded.');const built=await r.json();try{store.setLoaded(await loadWorkspace());}catch(e){store.fail(e);}ReactDOM.createRoot(document.getElementById('root')!).render(<App built={built}/>);}
main().catch(e=>{const root=document.getElementById('root')!;root.textContent='Knowledge Atlas could not start: '+e.message+'. Serve the extracted build over localhost or HTTPS; do not open index.html as a file.';});
