import React from '../vendor/react.mjs';
import {Icon,IconButton} from './Icon.js';
import {FloatingPanel} from './FloatingPanel.js';
import {FLAG_LABELS,THEME_LABELS} from '../core/model.js';
import type {Session,Page,View,Location,DocumentEntry} from '../core/model.js';
export type RailPopover='reading'|'theme'|'more'|null;
export function ReaderRail({session,page,view,location:loc,doc,leftVisible,contextOpen,popover,setPopover,onTree,onFocus,onContext,onCompare,onSwap,onBookmark,onTheme,onView,onSettings,onHome,onBookmarks,onEdit,onPrint,onFlags,onRating,rating}:any){
 const toggle=(name:RailPopover)=>setPopover(popover===name?null:name);
 const choose=(fn:()=>void)=>{fn();setPopover(null);};
 const integrated=!!window.atlasPdfLoader;
 return <><nav className="reader-rail" aria-label="Reader tools">
  <IconButton name="panel" label={leftVisible?'Collapse notebook sidebar':'Open notebook sidebar'} active={leftVisible} onClick={onTree}/>
  <span className="rail-separator"/>
  <IconButton name="focus" label={session.focus?'Exit focus mode':'Enter focus mode'} active={session.focus} onClick={onFocus}/>
  <IconButton name="book" label="Reading mode" aria-haspopup="dialog" aria-expanded={popover==='reading'} disabled={!page||!view} active={popover==='reading'} onClick={()=>toggle('reading')}/>
  <span className="rail-separator"/>
  <IconButton name="context" label="Open context panel" className="context-primary" active={contextOpen} aria-haspopup="dialog" aria-expanded={contextOpen} onClick={onContext}/>
  <span className="rail-separator"/>
  <IconButton name="split" label="Compare in two panes" active={session.panes.length===2} disabled={session.panes.length!==2&&!loc} onClick={onCompare}/>
  {session.panes.length===2&&<IconButton name="swap" label="Swap panes" onClick={onSwap}/>}
  <IconButton name="bookmark" label="Bookmark reading position" disabled={!page||!view} onClick={onBookmark}/>
  <span className="rail-separator"/>
  <IconButton name="theme" label="Theme" active={popover==='theme'} aria-haspopup="dialog" aria-expanded={popover==='theme'} onClick={()=>toggle('theme')}/>
  <span className="rail-spacer"/>
  <IconButton name="more" label="More / Settings" active={popover==='more'} aria-haspopup="dialog" aria-expanded={popover==='more'} onClick={()=>toggle('more')}/>
 </nav>
 {popover&&<FloatingPanel key={popover} title={popover==='reading'?'Reading mode':popover==='theme'?'Theme':'More / Settings'} className={'reader-popover popover-'+popover} onClose={()=>setPopover(null)}>
 {popover==='theme'&&<div className="theme-options">{Object.entries(THEME_LABELS).map(([id,label])=><button key={id} className={'theme-option '+(session.theme===id?'selected':'')} aria-pressed={session.theme===id} onClick={()=>choose(()=>onTheme(id))}><span className={'theme-swatch swatch-'+id} aria-hidden="true"/><span>{label}</span>{session.theme===id&&<Icon name="check" size={15}/>}</button>)}</div>}
 {popover==='reading'&&page&&view&&loc&&<div className="reading-options">
  <p className="popover-target">Pane {session.panes[0].id===session.activePane?'A':'B'} <span aria-hidden="true">/</span> {page.title}</p>
  {doc?<><p className="secondary">{integrated?'Physical PDF pages':'Browser preview only. App-controlled PDF modes require the optional integrated engine.'}</p><div className="mode-options">{(['single','continuous','spread'] as const).map(mode=><button key={mode} disabled={!integrated} aria-pressed={loc.pdfMode===mode} onClick={()=>choose(()=>onView((v:View)=>{v.history[v.cursor].pdfMode=mode;}))}>{mode[0].toUpperCase()+mode.slice(1)}</button>)}</div></>:<><div className="mode-options">{(['continuous','book','parallel'] as const).map(mode=><button key={mode} aria-pressed={loc.presentation===mode} className={loc.presentation===mode?'selected':''} onClick={()=>choose(()=>onView((v:View)=>{v.history[v.cursor].presentation=mode;}))}><Icon name={mode==='book'?'book':mode==='parallel'?'language':'page'} size={16}/>{mode[0].toUpperCase()+mode.slice(1)}</button>)}</div><button className="language-toggle" aria-pressed={view.english} aria-label={view.english?'Hide English':'Show English'} onClick={()=>onView((v:View)=>{v.english=!v.english;})}><Icon name="language" size={16}/>{view.english?'Hide English':'Show English'}</button></>}
 </div>}
 {popover==='more'&&<div className="more-options">
  <button onClick={()=>choose(onHome)}><Icon name="home"/>Home</button><button onClick={()=>choose(onBookmarks)}><Icon name="bookmark"/>Bookmarks</button>
  <hr/><button disabled={!page} onClick={()=>choose(onEdit)}><Icon name="edit"/>Edit current page</button><button disabled={!page} onClick={()=>choose(onPrint)}><Icon name="print"/>Print or Save as PDF</button>
  <hr/><label className="inline-check"><input type="checkbox" checked={session.showFlags} onChange={onFlags}/>Show learning flags</label>
  {page&&<label className="popover-field">Learning flag<select aria-label="Learning flag" value={rating??'gray'} onChange={e=>onRating(e.target.value)}>{Object.entries(FLAG_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>}
  <hr/><button onClick={()=>choose(onSettings)}><Icon name="settings"/>Workspace settings</button><small className="secondary">AtlasNote 1.2 <span aria-hidden="true">/</span> Local-first workspace</small>
 </div>}
 </FloatingPanel>}
 </>;
}
