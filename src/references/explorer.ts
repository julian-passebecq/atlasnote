import type {Personal} from '../core/model.js';
import type {ResourceTarget} from '../core/reading-types.js';
import {activeSession} from '../core/workspace-slots.js';
import {newView} from '../core/workspace.js';
/** A system tab owns no fake Page, no catalogue node and no reading history. */
export function openReferenceExplorer(personal:Personal,target?:ResourceTarget,conceptId?:string){
 const session=activeSession(personal),pane=session.panes.find(p=>p.id===session.activePane)??session.panes[0];
 const existing=pane.views.find(v=>v.referenceExplorer);if(existing){existing.referenceExplorer={...(existing.referenceExplorer?.returnViewId?{returnViewId:existing.referenceExplorer.returnViewId}:{}),...(target?{target:structuredClone(target)}:{}),...(conceptId?{conceptId}:{})};pane.active=existing.id;}
 else {if(pane.views.length>=5)throw Error('Close a tab before opening Reference Explorer (five tabs per pane).');const view=newView();view.referenceExplorer={...(target?{target:structuredClone(target)}:{}),...(conceptId?{conceptId}:{}),...(pane.active?{returnViewId:pane.active}:{})};pane.views.push(view);pane.active=view.id;}
 session.screen='reader';delete session.surface;
}
