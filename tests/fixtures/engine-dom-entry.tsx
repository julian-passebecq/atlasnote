/** TEST-ONLY entry. Never part of vite.config.mjs or hosted dist/. */
import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from '../../src/app/App';
import {store} from '../../src/storage/database';
import * as core from '../../src/core/workspace';
import * as slots from '../../src/core/workspace-slots';
import {projectLibrary} from '../../src/content-hub/taxonomy';
import '../../src/styles/app.css';
export function mount(built:any){
 if(location.href!=='about:blank')throw Error('DOM harness is restricted to about:blank');
 (store as any).enqueue=async()=>{};
 (window as any).testStore=store;(window as any).testCore=core;(window as any).testSlots=slots;
 window.atlasPdfLoader=()=>import('../../src/online/PdfEngine');
 (window as any).testReset=(id='page.atlas.pdf')=>{
  const ws=core.blankWorkspace(),v=core.newView(id),c=core.compose(built,ws);
  ws.personal.session.panes[0].views=[v];ws.personal.session.panes[0].active=v.id;ws.personal.session.screen='reader';delete ws.personal.session.surface;
  ws.personal.session.libraryMode=c.documents.some(d=>d.pageId===id)?'pdfs':'notes';
  ws.personal.session.expanded=projectLibrary(c,ws.overlays,ws.personal.session.libraryMode).flatMap(p=>{const ids=[p.id];const walk=(ns:any[])=>ns.forEach(n=>{if(n.children){ids.push(n.id);walk(n.children);}});walk(p.nodes);return ids;});
  store.setLoaded(ws);
 };
 (window as any).testReset();createRoot(document.getElementById('root')!).render(<App built={built}/>);
}
