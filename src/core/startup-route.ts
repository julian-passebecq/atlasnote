import type {Session, Anchor} from './model.js';
export type HashRoute = {id:string; collection:boolean; anchor?:Anchor};
export function parseHashRoute(hash:string):HashRoute|undefined {
 const match=hash.match(/^#\/(page|collection)\/([^?]+)(?:\?(.*))?$/);
 if(!match)return;
 const block=new URLSearchParams(match[3]??'').get('block');
 return {id:decodeURIComponent(match[2]),collection:match[1]==='collection',...(block?{anchor:{blockId:block}}:{})};
}
/** Startup is hydration, not user navigation. The last URL can belong to an
 * inactive pane/tab/history entry (or precede an empty Compare picker). Replaying
 * it into the active pane clones that route and destroys the restored session.
 * A genuinely new deep link still opens; subsequent hashchange always navigates.
 * This predicate is pure: it never normalizes or rewrites saved state. */
export function shouldOpenStartupRoute(session:Session,route:HashRoute):boolean {
 return !session.panes.some(p=>p.views.some(v=>v.history.some(l=>
  l.pageId===route.id && !!l.collectionId===route.collection)));
}
