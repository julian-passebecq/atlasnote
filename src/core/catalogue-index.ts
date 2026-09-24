import type {Catalogue,Page,DocumentEntry} from './model.js';
/** V3: O(1) lookups for a composed catalogue, built once per catalogue object.
 * Catalogues are produced fresh by compose()/historicalCatalogue(); the entry is
 * still revalidated against the array identities and lengths, so an array that
 * was replaced or appended to rebuilds the index instead of serving stale data. */
type Entry={pages:Page[];documents:DocumentEntry[];projects:unknown[];lengths:string;pageById:Map<string,Page>;docByPage:Map<string,DocumentEntry>;projectIds:Set<string>};
const cache=new WeakMap<Catalogue,Entry>();
export function catalogueLookup(c:Catalogue):Entry{
 const lengths=c.pages.length+'|'+c.documents.length+'|'+c.projects.length,hit=cache.get(c);
 if(hit&&hit.pages===c.pages&&hit.documents===c.documents&&hit.projects===c.projects&&hit.lengths===lengths)return hit;
 const pageById=new Map<string,Page>(),docByPage=new Map<string,DocumentEntry>();
 for(const p of c.pages)if(!pageById.has(p.id))pageById.set(p.id,p); // first wins, like Array.find
 for(const d of c.documents)if(!docByPage.has(d.pageId))docByPage.set(d.pageId,d);
 const entry={pages:c.pages,documents:c.documents,projects:c.projects,lengths,pageById,docByPage,projectIds:new Set(c.projects.map(p=>p.id))};
 cache.set(c,entry);return entry;
}
