import React,{useMemo} from '../vendor/react.mjs';
import type {Page,View} from '../core/model.js';
import {DISPLAY_LABELS,displayFeatures,displayKey,displayVisible,resetDisplay,setAllSections} from '../reader/display.js';
export function DisplayControls({page,view,onView}:{page:Page;view:View;onView:(fn:(v:View)=>void)=>void}){
 const {features,bilingual,sections}=useMemo(()=>displayFeatures(page),[page]);
 return <div className="reader-display-controls" role="group" aria-label="Visible reading content">
  <span>Show</span>{features.map(feature=><label key={feature}><input type="checkbox" checked={displayVisible(page.id,view,feature)} onChange={()=>onView(v=>{const key=displayKey(page.id,feature);v.revealed[key]=!v.revealed[key];})}/>{DISPLAY_LABELS[feature]}</label>)}
  {bilingual&&<label><input type="checkbox" checked={view.english} onChange={()=>onView(v=>{v.english=!v.english;})}/>English translation</label>}
  <button className="text-button" onClick={()=>onView(v=>{resetDisplay(page.id,v);setAllSections(page.blocks,v,false);})}>Show all content</button>
  {sections&&<><button className="text-button" onClick={()=>onView(v=>setAllSections(page.blocks,v,false))}>Expand all sections</button><button className="text-button" onClick={()=>onView(v=>setAllSections(page.blocks,v,true))}>Collapse all sections</button></>}
  {page.cheatsheet&&<small>Hidden blocks keep their fixed sheet frames. Source and exports stay complete.</small>}
 </div>;
}
