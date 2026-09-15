import React,{useState} from '../vendor/react.mjs';
import type {Page,Catalogue} from '../core/model.js';
import {Modal,Field} from '../components/Modal.js';
import {store} from '../storage/database.js';
import {uid} from '../core/workspace.js';
import {sha256,stable} from '../core/validation.mjs';
import {cheatsheetPage,parseCheatsheetSource,downloadCheatsheet} from './content.mjs';
import {renderCheatsheetPage} from './renderer.mjs';
import {CHEATSHEET_LIMITS} from './validation.mjs';

type Props={page?:Page;catalogue:Catalogue;onClose:()=>void;onOpen:(id:string)=>void;notify:(text:string,error?:boolean)=>void};
/** Bounded source editing. No executable SVG, layout designer or code runner. */
export function CheatsheetSourceDialog({page,catalogue,onClose,onOpen,notify}:Props){
 const [source,setSource]=useState(page?.cheatsheet?JSON.stringify(page.cheatsheet,null,2):'');
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 async function file(input:File|undefined){if(!input)return;try{if(input.size>CHEATSHEET_LIMITS.bytes)throw Error('Cheatsheet JSON must be at most 4 MiB.');setSource(await input.text());setError('');setStatus('Loaded locally. Validate and save to import.');}catch(e){setError((e as Error).message);}}
 function inspect(){const doc=parseCheatsheetSource(source);if(page?.cheatsheet&&doc.id!==page.cheatsheet.id)throw Error('Document ID is immutable when editing. Import a new local copy instead.');
  const warnings=doc.pages.flatMap((_,i)=>renderCheatsheetPage(doc,i+1).diagnostics.map(d=>'p.'+(i+1)+' '+d.blockId));
  if(warnings.length)throw Error('Fixed-frame overflow: '+warnings.slice(0,8).join(', ')+'. Enlarge frames or explicitly revise the content before saving.');return doc;
 }
 async function save(e:any){e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  const doc=inspect(),id=page?.id??uid('page.cheatsheet.local');
  const base=page?store.state.overlays.pages[page.id]?.page??page:undefined;
  // Editing preserves the existing wrapper metadata and every independent personal record.
  const next=base?{...structuredClone(base),title:doc.title,summary:doc.subtitle??base.summary,cheatsheet:structuredClone(doc)}:cheatsheetPage(doc,{pageId:id});
  const baseHash=base?(store.state.overlays.pages[id]?.baseHash??(catalogue.owners[id]?await sha256(stable(page)):undefined)):undefined;
  await store.overlays(o=>{
   o.pages[id]={page:next,...(baseHash?{baseHash}:{})};
   if(!base){const projectId='project.cheatsheets.local';let project=o.projects.find(p=>p.id===projectId);
    if(!project){project={id:projectId,title:'My cheatsheets',icon:'grid',description:'Private structured sources. Included in full workspace backups.',nodes:[]};o.projects.push(project);}
    project.nodes.push({id:uid('node.cheatsheet.local'),title:doc.title,pageId:id});
   }
  });onClose();if(!base)onOpen(id);notify(base?'Cheatsheet source saved locally.':'Cheatsheet imported as a new local copy.');
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Modal wide title={page?'Edit cheatsheet source':'Import cheatsheet JSON'} onClose={onClose}>
  <p className="secondary">Canonical structured JSON only. Pages stay 1200 x 1600. No scripts, raw SVG, remote images, fonts or code execution. Imports are private local copies.</p>
  <form onSubmit={save}>
   <Field label="Choose a JSON source file"><input type="file" accept=".json,application/json" aria-label="Cheatsheet JSON file" onChange={e=>void file(e.target.files?.[0])}/></Field>
   <Field label="Structured cheatsheet JSON"><textarea className="cheatsheet-source-editor" aria-label="Structured cheatsheet JSON" rows={16} spellCheck={false} value={source} onChange={e=>{setSource(e.target.value);setStatus('');setError('');}}/></Field>
   {error&&<p className="error-message" role="alert">{error}</p>}{status&&<p role="status">{status}</p>}
   <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button>{page?.cheatsheet&&<button type="button" onClick={()=>downloadCheatsheet(page.cheatsheet!)}>Export current source</button>}<button type="button" disabled={busy||!source.trim()} onClick={()=>{try{const doc=inspect();setError('');setStatus('Valid source: '+doc.pages.length+' physical pages; no renderer overflow.');}catch(e){setError((e as Error).message);}}}>Validate source</button><button className="primary" disabled={busy||!source.trim()}>{page?'Save cheatsheet source':'Import local cheatsheet'}</button></div>
  </form>
 </Modal>;
}
