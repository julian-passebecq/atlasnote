import React,{useState} from '../vendor/react.mjs';
import type {Workspace,Catalogue,CategoryId,Bookmark} from '../core/model.js';
import type {ReadingItem,ReadingTarget} from '../core/reading-types.js';
import {CATEGORIES} from '../core/workspace-slots.js';
import {bookmarkTarget,inferReadingCategory,normaliseReadingUrl} from '../core/reading-lists.js';
import {Icon,IconButton} from './Icon.js';
type Props={kind:'bookmark'|'later';workspace:Workspace;catalogue:Catalogue;canAdd:boolean;onAddCurrent:()=>void;onAddUrl:(url:string,category:CategoryId|null)=>Promise<void>;onOpen:(target:ReadingTarget)=>void;onActions:(target:ReadingTarget,title:string,e:any)=>void;onEdit:(id:string,title:string,note:string,category:CategoryId|null,read:boolean)=>Promise<void>;onDelete:(id:string)=>Promise<void>};
export function ReadingManager({kind,workspace:ws,catalogue,canAdd,onAddCurrent,onAddUrl,onOpen,onActions,onEdit,onDelete}:Props){
 const [category,setCategory]=useState<CategoryId|'all'>('all'),[filter,setFilter]=useState(''),[url,setUrl]=useState(''),[error,setError]=useState(''),[editing,setEditing]=useState<string|null>(null),[deleting,setDeleting]=useState<string|null>(null),[title,setTitle]=useState(''),[note,setNote]=useState(''),[editCat,setEditCat]=useState<CategoryId|null>(null),[busy,setBusy]=useState(false),[pendingOnly,setPendingOnly]=useState(false);
 const items:(Bookmark|ReadingItem)[]=kind==='bookmark'?ws.personal.bookmarks:ws.personal.readLater??[];
 const target=(e:Bookmark|ReadingItem)=>kind==='bookmark'?bookmarkTarget(e as Bookmark):(e as ReadingItem).target;
 const cat=(e:Bookmark|ReadingItem)=>e.category===undefined?inferReadingCategory(catalogue,ws,target(e)):e.category;
 const shown=items.filter(e=>(category==='all'||cat(e)===category)&&(!pendingOnly||!(e as ReadingItem).read)&&(!filter||[e.title,e.note??''].join(' ').toLocaleLowerCase().includes(filter.toLocaleLowerCase())));
 async function perform(f:()=>Promise<void>){if(busy)return;setBusy(true);setError('');try{await f();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="reading-manager" aria-label={kind==='bookmark'?'Bookmarks manager':'Read later manager'}>
  <div className="category-tabs" role="tablist" aria-label="Reading categories">{[{id:'all',label:'All'},...CATEGORIES].map(c=><button key={c.id} role="tab" tabIndex={category===c.id?0:-1} onKeyDown={e=>{const ids=['all',...CATEGORIES.map(x=>x.id)];if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const at=ids.indexOf(category),next=e.key==='Home'?0:e.key==='End'?ids.length-1:(at+(e.key==='ArrowRight'?1:-1)+ids.length)%ids.length;setCategory(ids[next] as any);setEditing(null);setDeleting(null);(e.currentTarget.parentElement?.children[next] as HTMLElement)?.focus();}}} aria-selected={category===c.id} onClick={()=>{setCategory(c.id as any);setEditing(null);setDeleting(null);}}>{c.label}</button>)}</div>
  <div className="reading-manager-body"><div className="reading-list-tools"><input aria-label="Filter saved reading" placeholder="Find a saved item..." value={filter} onChange={e=>setFilter(e.target.value)}/><button disabled={!canAdd||busy} onClick={onAddCurrent}><Icon name="plus" size={14}/>{kind==='bookmark'?'Bookmark current position':'Read current item later'}</button></div>
  {kind==='later'&&<><form className="read-later-url" onSubmit={e=>{e.preventDefault();void perform(async()=>{await onAddUrl(normaliseReadingUrl(url),category==='all'?'personal':category);setUrl('');});}}><input type="text" aria-label="Web address to read later" placeholder="Paste https://..." value={url} maxLength={2048} onChange={e=>setUrl(e.target.value)}/><button type="submit" disabled={!url.trim()||busy} aria-label="Add web address to Read later"><Icon name="plus"/></button></form><label className="inline-check reading-unread"><input type="checkbox" checked={pendingOnly} onChange={e=>setPendingOnly(e.target.checked)}/>Unread only</label></>}
  {error&&<p role="alert" className="error-message">{error}</p>}
  <div className="reading-items" role="tabpanel" aria-label={(kind==='bookmark'?'Bookmarks':'Read later')+' in '+category}>
  {!shown.length&&<p className="context-empty">No items in this view. Save a reading position or use a page's actions menu.</p>}
  {shown.map(item=>{const t=target(item),isRead=kind==='later'&&(item as ReadingItem).read;return <article key={item.id} className={'reading-item '+(isRead?'is-read':'')} data-reading-id={item.id}>
   {editing===item.id?<form onSubmit={e=>{e.preventDefault();void perform(async()=>{await onEdit(item.id,title,note,editCat,!!isRead);setEditing(null);});}}>
    <label>Title<input aria-label="Reading item title" value={title} required maxLength={120} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Note<textarea aria-label="Reading item note" value={note} rows={3} maxLength={1000} onChange={e=>setNote(e.target.value)}/></label>
    <label>Category<select aria-label="Reading item category" value={editCat??''} onChange={e=>setEditCat(e.target.value as CategoryId||null)}><option value="">Unfiled</option>{CATEGORIES.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select></label>
    <div className="button-row"><button type="submit" disabled={busy||!title.trim()}>Save reading details</button><button type="button" onClick={()=>setEditing(null)}>Cancel</button></div>
   </form>:<><div className="reading-item-heading">{t.kind==='url'?<a href={normaliseReadingUrl(t.url)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" title={t.url}><Icon name="link" size={14}/><strong>{item.title}</strong></a>:<button className="reading-open" onClick={()=>onOpen(t)} title={item.title}><Icon name={t.kind.startsWith('pdf')?'pdf':t.kind==='collection'?'folder':'bookmark'} size={14}/><strong>{item.title}</strong>{'pdfPage'in t&&<small>p.{t.pdfPage}</small>}</button>}
    {t.kind!=='url'&&<IconButton name="more" label={'Actions for saved item '+item.title} onClick={(e:any)=>onActions(t,item.title,e)}/>}</div>
    <small className="reading-item-meta">{CATEGORIES.find(c=>c.id===cat(item))?.label??'Unfiled'} / {new Date(item.createdAt).toLocaleDateString()}{t.kind==='pdf-category'?' / PDF category':''}</small>
    {item.note&&<p className="reading-item-note">{item.note}</p>}{t.kind==='url'&&<small className="reading-url-label">{t.url}</small>}
    <div className="reading-item-actions">{kind==='later'&&<button disabled={busy} onClick={()=>void perform(()=>onEdit(item.id,item.title,item.note??'',cat(item),!isRead))}>{isRead?'Mark unread':'Mark read'}</button>}
     <button onClick={()=>{setEditing(item.id);setTitle(item.title);setNote(item.note??'');setEditCat(cat(item));setDeleting(null);}}>Edit</button>
     {deleting===item.id?<><span>Remove?</span><button disabled={busy} onClick={()=>void perform(async()=>{await onDelete(item.id);setDeleting(null);})}>Confirm remove</button><button onClick={()=>setDeleting(null)}>Cancel</button></>:<button onClick={()=>setDeleting(item.id)}>Remove</button>}
    </div></>}
  </article>;})}</div><small className="reading-local-note">Shared across workspaces, organized by subject. Stored on this device and included in full backups.{kind==='later'?' Links are never fetched automatically.':''}</small></div>
 </section>;
}
