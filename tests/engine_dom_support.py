"""Shared existing about:blank PDF component harness. Never substitutes IndexedDB."""
import hashlib
from browser_support import ROOT

def mount_engine(page,base):
 page.expose_function('atlasTestSHA256',lambda a:list(hashlib.sha256(bytes(a)).digest()))
 css=[str(x.relative_to(ROOT/'.build/engine-dom')) for x in (ROOT/'.build/engine-dom/assets').glob('*.css')]
 script=next((ROOT/'.build/engine-dom/assets').glob('harness-*.js')).name
 page.set_content('<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="'+base+'">'+''.join('<link rel="stylesheet" href="'+x+'">' for x in css)+'</head><body><div id="root"></div></body></html>')
 page.add_script_tag(url=base+'app/vendor/jszip.js');page.add_script_tag(url=base+'app/vendor/prism.js')
 page.evaluate('''async({base,script})=>{
  if(!crypto.randomUUID)crypto.randomUUID=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(_,data)=>new Uint8Array(await window.atlasTestSHA256(Array.from(new Uint8Array(data.buffer??data,data.byteOffset??0,data.byteLength)))).buffer}});
  history.replaceState=()=>{};
  const {mount}=await import(base+'assets/'+script);mount(await(await fetch(base+'content.json')).json());
 }''',{'base':base,'script':script})
