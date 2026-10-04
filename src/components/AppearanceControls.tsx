import React from '../vendor/react.mjs';
import type {Session} from '../core/model.js';
import {THEME_LABELS} from '../core/model.js';
import {APPEARANCE_PRESETS,SHEET_THEME_LABELS,appearancePresetFor,sheetThemeFor} from '../core/appearance.mjs';
type Props={session:Session;onChange:(patch:Pick<Session,'theme'>|Pick<Session,'sheetTheme'>|Pick<Session,'theme'|'sheetTheme'>)=>void};
export function AppearanceControls({session,onChange}:Props){
 const selected=appearancePresetFor(session);
 return <div className="appearance-controls">
  <div className="appearance-presets" role="group" aria-label="Complete themes">{APPEARANCE_PRESETS.map(p=><button type="button" key={p.id} className="appearance-preset" aria-pressed={selected===p.id} onClick={()=>onChange({theme:p.theme as Session['theme'],sheetTheme:p.sheetTheme as Session['sheetTheme']})}>
   <span className={'appearance-preview preview-'+p.id} aria-hidden="true"><i/><i/></span><span><strong>{p.label}</strong><small>{p.description}</small></span>
  </button>)}</div>
  <p className="secondary">Choose a complete theme, or mix the interface and sheets below.</p>
  <label className="appearance-field">Interface theme<select aria-label="Interface theme" value={session.theme} onChange={e=>onChange({theme:e.target.value as Session['theme']})}>{Object.entries(THEME_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <label className="appearance-field">Sheet theme<select aria-label="Sheet theme" value={sheetThemeFor(session)} onChange={e=>onChange({sheetTheme:e.target.value as Session['sheetTheme']})}>{Object.entries(SHEET_THEME_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
  <small className="secondary">Sheets and reading pages only. Original PDF artwork and exports keep their colors.</small>
 </div>;
}
