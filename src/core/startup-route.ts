import type {Session, Anchor} from './model.js';
export type HashRoute = {id:string; collection:boolean;historyRevisionId?:string; anchor?:Anchor};
export function parseHashRoute(hash:string):HashRoute|undefined {
 const match=hash.match(/^#\/(page|collection)\/([^?]+)(?:\?(.*))?$/);
 if(!match)return;
 const params=new URLSearchParams(match[3]??''),block=params.get('block'),revision=params.get('revision');if(revision&&!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(revision))throw Error('Invalid history revision link');
 return {id:decodeURIComponent(match[2]),collection:match[1]==='collection',...(block?{anchor:{blockId:block}}:{}),...(revision?{historyRevisionId:revision}:{})};
}
/** Startup is hydration, not user navigation. The last URL can belong to an
 * inactive pane/tab/history entry (or precede an empty Compare picker). Replaying
 * it into the active pane clones that route and destroys the restored session.
 * A genuinely new deep link still opens; subsequent hashchange always navigates.
 * This predicate is pure: it never normalizes or rewrites saved state. */
export function shouldOpenStartupRoute(session:Session,route:HashRoute):boolean {
 return !session.panes.some(p=>p.views.some(v=>v.history.some(l=>
  l.pageId===route.id && l.historyRevisionId===route.historyRevisionId && !!l.collectionId===route.collection)));
}
