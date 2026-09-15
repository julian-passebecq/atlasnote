import {togglePdfGrid,activeSession,selectWorkspace,collapsePane,revealPane,toggleQuickLayout,categoryMatches} from '../core/workspace-slots.js';
import {libraryProjectionCounts} from '../core/library-projection.js';
import {createFullscreenController} from '../core/fullscreen.js';
import React, { useState, useEffect, useMemo, useRef, useSyncExternalStore } from '../vendor/react.mjs';
import type { Catalogue, Session, View, Anchor, Pane, Page, Location } from '../core/model.js';
import { FLAG_LABELS } from '../core/model.js';
import { store } from '../storage/database.js';
import { compose, current, newView, navigate, travel, locations, uid, isArchived, findNode, toggleCompare } from '../core/workspace.js';
import { walkBlocks } from '../core/validation.mjs';
import { Icon, IconButton } from '../components/Icon.js';
import { Modal } from '../components/Modal.js';
import { ProjectTree } from '../components/Tree.js';
import { Home } from '../components/Home.js';
import { NoteReader } from '../reader/Reader.js';
import { PdfReader } from '../pdf/PdfReader.js';
import { ContextPanel, SearchDialog } from '../components/SearchContext.js';
import { SettingsDialog } from '../components/SettingsDialog.js';
import { CreateDialog, ManageDialog, EditPageDialog, GroupsDialog } from '../components/EditDialogs.js';
import { ExportDialog, PrintProjection } from '../components/ExportDialog.js';
import { ContentUnits } from '../reader/blocks.js';
import { CollectionView } from '../components/CollectionView.js';
import { collectionTarget } from '../core/collections.js';
import {parseHashRoute,shouldOpenStartupRoute} from '../core/startup-route.js';
import {ReadingManager} from '../components/ReadingManager.js';
import {ReadingActions} from '../components/ReadingActions.js';
import type {ReadingActionMenu} from '../components/ReadingActions.js';
import type {ReadingTarget,ReadingDestination} from '../core/reading-types.js';
import {addReadLater,addReadingBookmark,editReadingItem,targetForPage,inferReadingCategory,bookmarkTarget} from '../core/reading-lists.js';
import {openReadingTarget} from '../core/reading-navigation.js';
import {SavedStatesDialog} from '../components/SavedStatesDialog.js';
import {saveReadingState,restoreReadingState,renameReadingState,deleteReadingState,latestStateSave,scopeLabel} from '../core/saved-states.js';
import type {SaveScope} from '../core/saved-states-types.js';
import {CompanionPanel} from '../companion/CompanionPanel.js';
import {prepareOpenPdf} from '../pdf/study-bridge.js';
import {promoteStudyTerm} from '../companion/promote.js';
import {resolveStudy} from '../companion/tree.js';
import {ReaderRail} from '../components/ReaderRail.js';
import type {RailPopover} from '../components/ReaderRail.js';
import {FloatingPanel} from '../components/FloatingPanel.js';
import { assetResolver } from './assets.js';
export function App({built}:any){
 const ws=useSyncExternalStore(store.subscribe,store.getSnapshot);
 const [toast,setToast]=useState({text:'',error:false});
 return <StudyWorkspace key={(ws.personal.activeWorkspaceSlot??1)+':'+(ws.personal.savedStates?.restoreRevision??0)} built={built} toast={toast} setToast={setToast}/>;
}
function StudyWorkspace({ built,toast,setToast }: any) {
    const ws = useSyncExternalStore(store.subscribe, store.getSnapshot), slotId=ws.personal.activeWorkspaceSlot??1, session = activeSession(ws.personal);
    const catalogue = useMemo(() => compose(built, ws), [built, ws.imports, ws.overlays]), catalogueRef = useRef(catalogue);
    catalogueRef.current = catalogue;
    useEffect(()=>{document.documentElement.dataset.theme=session.theme;},[session.theme]);
    const assets = useMemo(() => assetResolver(built, () => catalogueRef.current), [built]);
    const locs = useMemo(() => locations(catalogue), [catalogue]);
    const discoveryCounts=useMemo(()=>libraryProjectionCounts(catalogue.projects.filter(p=>categoryMatches(p.id,session.categoryFilter,ws.overlays.categories)),new Set(catalogue.documents.map(d=>d.pageId)),new Set(ws.overlays.archived),session.libraryMode??'notes',new Set(Object.entries(ws.overlays.projectPrefs).filter(([,p])=>p.hidden).map(([id])=>id))),[catalogue,ws.overlays,session.libraryMode,session.categoryFilter]);
    const [pdfRenderers,setPdfRenderers]=useState<Record<string,string>>({});
    const activePane = session.panes.find(p => p.id === session.activePane) ?? session.panes[0], activeView = activePane?.views.find(v => v.id === activePane.active), activeLocation = current(activeView), activePage = catalogue.pages.find(p => p.id === activeLocation?.pageId);
    const [modal, setModal] = useState<any>(null), [printSelection, setPrintSelection] = useState<any>(null), [mobilePane, setMobilePane] = useState(session.activePane);
    const [contextOpen,setContextOpen]=useState(false),[popover,setPopover]=useState<RailPopover>(null);
    const [managerMode,setManagerMode]=useState<'context'|'bookmark'|'later'>('context'),[contextTab,setContextTab]=useState<'workspace'|'all'|'remarks'|'details'>('workspace'),[readingMenu,setReadingMenu]=useState<ReadingActionMenu|null>(null);
    const [small, setSmall] = useState(window.innerWidth < 900), [mobileSide, setMobileSide] = useState('');
    useEffect(() => { const f = () => setSmall(window.innerWidth < 900); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
    useEffect(() => { setMobilePane(session.activePane); }, [session.activePane]);
    const appRef = useRef<HTMLDivElement | null>(null), paneArea = useRef<HTMLDivElement | null>(null), drag = useRef(false), ratioDraft = useRef(session.ratio);
    function notify(text: string, error = false) { setToast({ text, error }); }
    useEffect(() => { if (!toast.text)
        return; const t = setTimeout(() => setToast({ text: '', error: false }), 6500); return () => clearTimeout(t); }, [toast]);
    const capturingReaders=useRef(false);
    function captureReaders(){if(capturingReaders.current)return;capturingReaders.current=true;try{document.dispatchEvent(new Event('atlas:before-reader-change'));}finally{capturingReaders.current=false;}}
    function setSession(fn: (s: Session) => void) {
 if((store.state.personal.activeWorkspaceSlot??1)!==slotId||(store.state.personal.savedStates?.restoreRevision??0)!==(ws.personal.savedStates?.restoreRevision??0))return;
 captureReaders();store.personal(p => fn(activeSession(p,slotId)));
 syncHash(activeSession(store.state.personal,slotId));
}
function syncHash(s:Session){const pane=s.panes.find(p=>p.id===s.activePane),loc=current(pane?.views.find(v=>v.id===pane.active));history.replaceState(null,'',s.screen==='reader'&&loc?(loc.collectionId?'#/collection/':'#/page/')+encodeURIComponent(loc.pageId):'#/');}
function switchWorkspace(n:import('../core/model.js').WorkspaceNumber){if(n===slotId)return;captureReaders();setContextOpen(false);setPopover(null);fullscreen.current?.exit();store.personal(p=>selectWorkspace(p,n));syncHash(activeSession(store.state.personal));}
function followDocument(s:Session,id?:string){if(!id||collectionTarget(catalogueRef.current,id))return;s.libraryMode=catalogueRef.current.documents.some(d=>d.pageId===id)?'pdfs':'notes';exposePage(s,id);}
function selectTab(paneId:string,viewId:string){setSession(s=>{const p=s.panes.find(p=>p.id===paneId);if(!p||!p.views.some(v=>v.id===viewId))return;revealPane(s,paneId);p.active=viewId;s.screen='reader';followDocument(s,current(p.views.find(v=>v.id===viewId))?.pageId);syncHash(s);});}
function selectMarker(index:number){const p=activeSession(store.state.personal).panes[index];if(!p)return;setSession(s=>{revealPane(s,p.id);s.screen='reader';followDocument(s,current(p.views.find(v=>v.id===p.active))?.pageId);syncHash(s);});}
function sidebar(){setSession(s=>{s.leftOpen=small?true:!leftVisible;});if(small)setMobileSide(mobileSide==='left'?'':'left');}
function toggleChrome(paneId:string){document.dispatchEvent(new CustomEvent('atlas:reader-chrome',{detail:{paneId}}));setSession(s=>{const p=s.panes.find(p=>p.id===paneId);if(p)p.readerChromeCollapsed=!(p.readerChromeCollapsed??true);});}

    const stateBusyRef=useRef(false),[stateBusy,setStateBusy]=useState(false);
    async function savedStateAction(action:(p:import('../core/model.js').Personal)=>void,message:string){
      if(stateBusyRef.current)return;
      stateBusyRef.current=true;setStateBusy(true);
      try{captureReaders();await store.flush();if(store.error)throw Error('Resolve the storage warning before saving or restoring a state.');
        await store.personal(action);notify(message);
      }catch(e){notify((e as Error).message,true);throw e;}
      finally{stateBusyRef.current=false;setStateBusy(false);}
    }
    async function saveState(scope:SaveScope){
      const label=scopeLabel(scope)+(scope===slotId&&activePage?' - '+activePage.title:'');
      try{await savedStateAction((p:any)=>{saveReadingState(p,scope,label);},scopeLabel(scope)+' saved. Add a progress note in Saved states.');}catch{}
    }
    async function restoreState(id:string){
      try{await savedStateAction((p:any)=>{restoreReadingState(p,id);syncHash(activeSession(p));},'Saved state restored. Undo is available in Saved states.');setModal(null);}catch{}
    }
    function toggleLibrary(){setSession(s=>{s.libraryMode=s.libraryMode==='pdfs'?'notes':'pdfs';s.leftOpen=true;});if(small)setMobileSide('left');}
    function navigation(){return <nav className="sidebar-navigation" aria-label="Library navigation">
      <IconButton name={session.libraryMode==='pdfs'?'pdf':'book'} className="library-mode-switch" label={session.libraryMode==='pdfs'?'Switch to notes':'Switch to PDF library'} active={session.libraryMode==='pdfs'} onClick={toggleLibrary}/>
      <IconButton name="search" className="global-search" label="Global search" title="Search notes, PDFs and glossary (Ctrl/Cmd+K)" onClick={()=>setModal({kind:'search'})}/>
      <IconButton name="left" label="Back in active tab" disabled={!activeView||activeView.cursor<=0} onClick={()=>historyStep(-1)}/>
      <IconButton name="right" label="Forward in active tab" disabled={!activeView||activeView.cursor>=activeView.history.length-1} onClick={()=>historyStep(1)}/>
      <IconButton name="panel" label={leftVisible?'Collapse notebook sidebar':'Open notebook sidebar'} active={leftVisible} onClick={sidebar}/>
      <IconButton className="global-chrome-toggle" name="chrome" label={(activePane?.readerChromeCollapsed??true)?'Show reader controls':'Hide reader controls'} active={activePane?.readerChromeCollapsed??true} disabled={!activePane} onClick={()=>toggleChrome(activePane.id)}/>
    </nav>;}
    function openManager(mode:'context'|'bookmark'|'later'){setPopover(null);setManagerMode(mode);setContextOpen(true);}
    function showReadingActions(target:ReadingTarget,title:string,e:any){e.preventDefault();e.stopPropagation();const origin=e.currentTarget as HTMLElement,r=origin.getBoundingClientRect();setReadingMenu({target,title,x:e.clientX||r.left,y:e.clientY||r.bottom,origin});}
    function openTarget(target:ReadingTarget,destination:ReadingDestination='here'){
      try{captureReaders();store.personal(p=>openReadingTarget(p,catalogueRef.current,store.state.overlays,target,destination)).catch(e=>notify(e.message,true));syncHash(activeSession(store.state.personal));setReadingMenu(null);setContextOpen(false);setMobileSide('');}
      catch(e){notify((e as Error).message,true);}
    }
    async function saveTarget(kind:'bookmark'|'later',target:ReadingTarget,title:string,category?:import('../core/model.js').CategoryId|null){
      const subject=category===undefined?inferReadingCategory(catalogueRef.current,store.state,target):category;
      await savedStateAction(p=>{if(kind==='later')addReadLater(p,target,title.slice(0,120),subject);else addReadingBookmark(p,target,title.slice(0,120),subject);},kind==='later'?'Added to Read later.':'Bookmark saved.');setReadingMenu(null);
    }
    function addCurrent(kind:'bookmark'|'later'){
      captureReaders();const s=activeSession(store.state.personal),pane=s.panes.find(p=>p.id===s.activePane),l=current(pane?.views.find(v=>v.id===pane.active));if(!l)return;
      const target=targetForPage(catalogueRef.current,l.pageId,l.anchor),title=catalogueRef.current.pages.find(p=>p.id===l.pageId)?.title??collectionTarget(catalogueRef.current,l.pageId)?.title??'Saved reading';
      void saveTarget(kind,target,title).catch(()=>{});
    }
    function managerPanel(){
      if(managerMode!=='context')return <ReadingManager key={managerMode} kind={managerMode} workspace={ws} catalogue={catalogue} canAdd={!!activeLocation} onAddCurrent={()=>addCurrent(managerMode)} onAddUrl={(url,category)=>saveTarget('later',{kind:'url',url},url.slice(0,120),category)} onOpen={t=>openTarget(t)} onActions={showReadingActions} onEdit={(id,title,note,category,read)=>savedStateAction(p=>editReadingItem(p,managerMode,id,title,note,category,read),'Reading details saved.')} onDelete={id=>savedStateAction(p=>{if(managerMode==='bookmark')p.bookmarks=p.bookmarks.filter(e=>e.id!==id);else p.readLater=p.readLater?.filter(e=>e.id!==id);},'Reading item removed.')}/>;
      return <div className="management-context"><div className="management-tabs" role="tablist" aria-label="Context managers">{(['workspace','all','remarks','details'] as const).map(t=><button role="tab" aria-selected={contextTab===t} key={t} onClick={()=>setContextTab(t)}>{t==='workspace'?'Workspace saves':t==='all'?'All-workspace saves':t==='remarks'?'Remarks':'Page details'}</button>)}</div><div className="management-body">
      {contextTab==='workspace'||contextTab==='all'?<SavedStatesDialog embedded key={contextTab} initialScope={contextTab==='all'?'all':slotId} onlyWorkspaces={contextTab==='workspace'} personal={ws.personal} busy={stateBusy} onClose={()=>setContextOpen(false)} onSave={saveState} onRestore={restoreState} onRename={(id,title,note)=>savedStateAction(p=>renameReadingState(p,id,title,note),'Save details updated.')} onDelete={id=>savedStateAction(p=>deleteReadingState(p,id),'Saved state deleted. Notes and PDFs are unchanged.')}/>:<ContextPanel key={contextTab} initialTab={contextTab==='remarks'?'remarks':'context'} resolveAsset={assets.url} catalogue={catalogue} page={session.screen==='reader'?activePage:undefined} view={activeView} location={activeLocation} workspace={ws} onOpen={openPage} onJump={jump} onClose={()=>setContextOpen(false)} notify={notify}/>}
      </div></div>;
    }
    function pdfNavigate(id:string,n:number,newTab=false){
      const doc=catalogueRef.current.documents.find(d=>d.pageId===id);if(!doc||!Number.isInteger(n)||n<1)return;
      const s=activeSession(store.state.personal),pane=s.panes.find(p=>p.id===s.activePane)!;
      const existing=pane.views.find(v=>v.id===pane.active&&current(v)?.pageId===id)??pane.views.find(v=>current(v)?.pageId===id);
      if(existing&&!newTab){setSession(s=>{const p=s.panes.find(p=>p.id===pane.id)!;p.active=existing.id;const l=current(p.views.find(v=>v.id===existing.id))!;l.pdfPage=n;l.anchor={pdfPage:n,...(doc.sha256?{pdfRevision:doc.sha256}:{})};s.screen='reader';revealPane(s,p.id);followDocument(s,id);});setMobileSide('');setModal(null);}
      else openPage(id,{pdfPage:n,...(doc.sha256?{pdfRevision:doc.sha256}:{})},newTab);
    }
    function freshTab(paneId:string){const pane=activeSession(store.state.personal).panes.find(p=>p.id===paneId);if(!pane)return;if(pane.views.length>=5){notify('Keep up to five tabs in each pane. Close a tab before opening another.');return;}setSession(s=>{const p=s.panes.find(p=>p.id===paneId)!;const v=newView();p.views.push(v);p.active=v.id;s.activePane=p.id;s.screen='reader';});}
    const fullscreen=useRef<ReturnType<typeof createFullscreenController>|null>(null);
    useEffect(()=>{if(!appRef.current)return;const controller=createFullscreenController(appRef.current,document,()=>{
        if(activeSession(store.state.personal).focus)setSession(s=>{s.focus=false;});
    });fullscreen.current=controller;return()=>{controller.dispose();fullscreen.current=null;};},[]);
    useEffect(()=>{if(!session.focus)fullscreen.current?.exit();},[session.focus]);
    function toggleFocus(){const next=!activeSession(store.state.personal).focus;setContextOpen(false);setPopover(null);setSession(s=>{s.focus=next;});
        // Deliberately not an effect: requestFullscreen must retain the click activation.
        if(next){document.dispatchEvent(new Event('atlas:focus-enter'));fullscreen.current?.enter();}else fullscreen.current?.exit();
    }

    function updateView(paneId: string, viewId: string, fn: (v: View) => void) { setSession(s => { const v = s.panes.find(p => p.id === paneId)?.views.find(v => v.id === viewId); if (v)
        fn(v); }); }
    function activate(paneId: string) { if (activeSession(store.state.personal).activePane !== paneId)
 setSession(s => { revealPane(s,paneId);const pane=s.panes.find(p=>p.id===paneId);followDocument(s,current(pane?.views.find(v=>v.id===pane.active))?.pageId); }); setMobilePane(paneId); }
    function exposePage(s: Session, id: string) { const loc = locations(catalogueRef.current).get(id); for (const branch of loc?.ancestors ?? [])
        if (!s.expanded.includes(branch))
            s.expanded.push(branch); }
    function openPage(id: string, anchor?: Anchor, newTab = false, paneId?: string, presentation?: Location['presentation']) { const target = paneId ?? activeSession(store.state.personal).activePane; const c = catalogueRef.current; let blocked = false; setSession(s => { let pane = s.panes.find(p => p.id === target) ?? s.panes[0]; if (!pane) {
        pane = { id: 'left', views: [], active: '' };
        s.panes.push(pane);
    } const existing = pane.views.find(v => v.id === pane.active); if (newTab && pane.views.length >= 5) {
        blocked = true;
        return;
    } if (!existing || newTab) {
        const v = newView(id, anchor);
        pane.views.push(v);
        pane.active = v.id;
    }
    else {
        const index = pane.views.indexOf(existing);
        pane.views[index] = navigate(existing, id, anchor);
    } revealPane(s,pane.id); s.screen = 'reader'; followDocument(s,id); exposePage(s, id); const view = pane.views.find(v => v.id === pane.active)!; if(anchor?.pdfPage&&c.documents.some(d=>d.pageId===id)){current(view)!.pdfPage=anchor.pdfPage;} if(collectionTarget(c,id))current(view)!.collectionId=id; if (presentation)
        current(view)!.presentation = presentation; if (anchor?.blockId) {
        const page = c.pages.find(p => p.id === id);
        if (page)
            walkBlocks(page.blocks, (b: any, parents: any) => { if (b.id === anchor.blockId) {
                parents.forEach((p: string) => view.collapsed[p] = false);
                if (b.type === 'section')
                    view.collapsed[b.id] = false;
            } });
    } }); if (blocked) {
        notify('Keep up to five tabs in each pane. Close a tab before opening another.');
        return;
    } setMobilePane(target); setMobileSide(''); setModal(null); history.replaceState(null, '', (collectionTarget(c,id)?'#/collection/':'#/page/') + encodeURIComponent(id) + (anchor?.blockId ? '?block=' + encodeURIComponent(anchor.blockId) : '')); }
    function jump(blockId: string, paneId = activePane?.id, viewId = activeView?.id) { if (!paneId || !viewId)
        return; updateView(paneId, viewId, v => { const loc = current(v)!; const page = catalogueRef.current.pages.find(p => p.id === loc.pageId); if (page)
        walkBlocks(page.blocks, (b: any, parents: any) => { if (b.id === blockId) {
            parents.forEach((id: string) => v.collapsed[id] = false);
            if (b.type === 'section')
                v.collapsed[b.id] = false;
        } }); loc.anchor = { blockId }; }); }
    function historyStep(delta: number, paneId = activePane?.id) { setSession(s => { const pane = s.panes.find(p => p.id === paneId); if (!pane)
        return; const index = pane.views.findIndex(v => v.id === pane.active); if (index < 0)
        return; pane.views[index] = travel(pane.views[index], delta); s.activePane = pane.id; s.screen = 'reader'; followDocument(s,current(pane.views[index])?.pageId); }); }
    function closeTab(paneId: string, viewId: string) { setSession(s => { const pane = s.panes.find(p => p.id === paneId)!; const index = pane.views.findIndex(v => v.id === viewId); pane.views.splice(index, 1); if (pane.active === viewId)
        pane.active = pane.views[Math.min(index, pane.views.length - 1)]?.id ?? ''; if (s.panes.every(p => !p.views.length))
        s.screen = 'home'; }); }
    function compare() { setSession(s => { toggleCompare(s); setMobilePane(s.activePane); }); }
    function bookmarkDocument(id: string) { const page = catalogueRef.current.pages.find(p => p.id === id); if (!page)
        return; store.personal(p => { const found = p.bookmarks.find(b => b.pageId === id && !b.anchor && (!b.target || b.target.kind==='page')); if (found)
        p.bookmarks = p.bookmarks.filter(b => b.id !== found.id);
    else
        p.bookmarks.push({ id: uid('bookmark'), pageId: id, title: page.title, createdAt: Date.now() }); }); notify('Document bookmark updated.'); }
    function openOther(id: string) { const s = activeSession(store.state.personal), other = s.panes.find(p => p.id !== s.activePane); if (other)
        openPage(id, undefined, false, other.id); }
    function closePane(id: string) { setSession(s => { if (s.panes.length === 1)
        return; s.panes = s.panes.filter(p => p.id !== id); s.activePane = s.panes[0].id; s.collapsedPane=null; if (!s.panes[0].views.length)
        s.screen = 'home'; setMobilePane(s.activePane); }); }
    function bookmark(page: Page, view: View) { const loc = current(view)!, anchor = loc.anchor; store.personal(p => { const found = p.bookmarks.find(b => b.pageId === page.id && JSON.stringify(b.anchor ?? {}) === JSON.stringify(anchor ?? {})); if (found)
        p.bookmarks = p.bookmarks.filter(b => b.id !== found.id);
    else
        p.bookmarks.push({ id: uid('bookmark'), pageId: page.id, title: page.title, ...(anchor?{anchor:structuredClone(anchor)}:{}), createdAt: Date.now() }); }); notify('Bookmarks updated.'); }
    async function blockAction(action: string, id: string, snippet: string | undefined, paneId: string, view: View, page: Page) { if (action === 'section' || action === 'answer') {
        updateView(paneId, view.id, v => { if (action === 'section') {
            let block: any;
            walkBlocks(page.blocks, (b: any) => { if (b.id === id)
                block = b; });
            v.collapsed[id] = !(v.collapsed[id] ?? block?.collapsed ?? false);
        }
        else
            v.revealed[id] = !v.revealed[id]; });
    }
    else if (action === 'continuous-block') {
        updateView(paneId, view.id, v => { current(v)!.presentation = 'continuous'; current(v)!.anchor = { blockId: id }; });
    }
    else if (action === 'copy-code') {
        let b: any;
        walkBlocks(page.blocks, (x: any) => { if (x.id === id)
            b = x; });
        const text = snippet ?? b?.code ?? '';
        try {
            await navigator.clipboard.writeText(text);
            notify('Whole code snippet copied.');
        }
        catch {
            setModal({ kind: 'copy', text });
        }
    }
    else if (action === 'enlarge') {
        let block: any;
        walkBlocks(page.blocks, (b: any) => { if (b.id === id)
            block = b; });
        if (block)
            setModal({ kind: 'figure', page: { ...page, blocks: [block] }, view });
    } }
    useEffect(() => {
        const onHash=(initial=false)=>{try{const route=parseHashRoute(location.hash);if(route&&(!initial||shouldOpenStartupRoute(activeSession(store.state.personal),route)))openPage(route.id,route.anchor);}catch{notify('This page link is malformed.',true);}};
        onHash(true);const changed=()=>onHash(false);window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);
    }, []);
    useEffect(() => { const key = (e: KeyboardEvent) => { const s = activeSession(store.state.personal); if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal({ kind: 'search' });
    } if (e.altKey && ['ArrowLeft', 'ArrowRight'].includes(e.key) && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        historyStep(e.key === 'ArrowLeft' ? -1 : 1, s.activePane);
    } if (e.key === 'Escape' && s.focus && !document.querySelector('dialog[open]'))
        setSession(x => { x.focus = false; }); }; document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key); }, []);
    useEffect(() => { if (!printSelection)
        return; let cancelled = false; const prepare = async () => { await document.fonts?.ready; const deadline = Date.now() + 12000; while (Date.now() < deadline && document.querySelector('.print-projection .diagram-loading'))
        await new Promise(r => setTimeout(r, 100)); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); if (!cancelled) {
        window.print();
        setPrintSelection(null);
    } }; prepare(); return () => { cancelled = true; }; }, [printSelection]);
    const leftVisible = session.leftOpen && !session.focus && (!small || mobileSide === 'left'), rightVisible = contextOpen && !session.focus;
    const setModalCreate = (kind: string, project?: any, folder?: any) => setModal({ kind: 'create', itemKind: kind, project, folder });
    const settings = () => setModal({ kind: 'settings' }), onRestore = (id: string) => store.overlays(o => { o.archived = o.archived.filter(x => x !== id); });
    function renderPane(pane: Pane, index: number) {
 const letter=index===0?'A':'B',view=pane.views.find(v=>v.id===pane.active),loc=current(view),page=catalogue.pages.find(p=>p.id===loc?.pageId),doc=catalogue.documents.find(d=>d.pageId===page?.id),crumb=page?locs.get(page.id):undefined,active=pane.id===session.activePane;
 if(session.collapsedPane===pane.id)return <aside className="collapsed-pane" data-pane-id={pane.id} data-pane-slot={index===0?'a':'b'} key={pane.id}><button aria-label={'Restore pane '+letter} onClick={()=>setSession(s=>{revealPane(s,pane.id);followDocument(s,loc?.pageId);})}>{letter}<Icon name="chevron" size={14}/></button></aside>;
 const paired=session.panes.length===2&&!session.collapsedPane;
 return <section key={pane.id} data-pane-id={pane.id} data-pane-slot={index===0?'a':'b'} className={'document-pane '+(active?'active-pane ':'')+((pane.readerChromeCollapsed??true)?'reader-chrome-hidden ':'')+(session.panes.length===2&&pane.id!==mobilePane?'mobile-inactive':'')} style={paired?{flex:'0 0 '+(index===0?'calc(var(--ratio,50%) - 4px)':'calc(100% - var(--ratio,50%) - 4px)')}:{flex:'1'}} onPointerDownCapture={()=>activate(pane.id)} onFocusCapture={()=>activate(pane.id)} aria-label={session.panes.length===2?'Reading pane '+(index+1):'Reading pane'}>
 <div className="pane-tabbar">
 {session.panes.length===2&&<button className={'pane-identity '+(active?'is-active':'')} aria-label={'Collapse pane '+letter} title={'Collapse pane '+letter+' without closing its tabs'} disabled={!!session.collapsedPane} onClick={()=>setSession(s=>{collapsePane(s,pane.id);const target=s.panes.find(p=>p.id===s.activePane);followDocument(s,current(target?.views.find(v=>v.id===target.active))?.pageId);})}>{letter}{active&&<span aria-hidden="true">*</span>}</button>}
 {session.panes.length===1&&<span className="pane-identity is-active" aria-label="Pane A">A</span>}
 <IconButton className="pane-new-tab" name="plus" label={'New tab in pane '+(index+1)} onClick={()=>freshTab(pane.id)}/>
 <div className="tab-list" role="tablist" aria-label={'Document tabs in pane '+(index+1)}>{pane.views.map(v=>{
 const route=current(v),p=catalogue.pages.find(p=>p.id===route?.pageId),collection=route?.collectionId?collectionTarget(catalogue,route.collectionId):undefined;
 return <div role="tab" aria-selected={v.id===pane.active} tabIndex={v.id===pane.active?0:-1} className={'document-tab '+(v.id===pane.active?'selected':'')} key={v.id} title={p?.title??collection?.title??'New tab'} onClick={()=>selectTab(pane.id,v.id)} onKeyDown={e=>{
 if(e.target!==e.currentTarget)return;
 if(e.key==='Enter'||e.key===' '){e.preventDefault();selectTab(pane.id,v.id);}
 if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=pane.views[(pane.views.indexOf(v)+(e.key==='ArrowRight'?1:-1)+pane.views.length)%pane.views.length];selectTab(pane.id,next.id);const tabList=e.currentTarget.parentElement;requestAnimationFrame(()=>tabList?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus());}
 }}><Icon name={catalogue.documents.some(d=>d.pageId===p?.id)?'pdf':'page'} size={15}/><span>{p?.title??collection?.title??(route?'Unavailable':'New tab')}</span><button className="tab-close" aria-label={'Close tab '+(p?.title??collection?.title??'new tab')} onClick={e=>{e.stopPropagation();closeTab(pane.id,v.id);}}><Icon name="close" size={13}/></button></div>;
 })}</div>
 <div className="pane-header-actions">
 <IconButton name={doc?'spread':'openbook'} label={doc?'Quick PDF Spread':'Quick Book mode'} disabled={!loc||!page} active={doc?loc?.pdfMode==='spread':loc?.presentation==='book'} onClick={()=>{if(view)updateView(pane.id,view.id,v=>toggleQuickLayout(v,!!doc));}}/>
 {doc&&<IconButton name="grid" label="Quick four-page PDF grid" disabled={pdfRenderers[(view?.id??'')+doc.id]!=='integrated'} active={loc?.pdfMode==='grid'} onClick={()=>{if(view)updateView(pane.id,view.id,togglePdfGrid);}}/>}
 {active&&<>
 <IconButton name="down" label="Reading mode" disabled={!page||!view} aria-haspopup="dialog" aria-expanded={popover==='reading'} onClick={()=>{setContextOpen(false);setPopover(popover==='reading'?null:'reading');}}/>
 </>}
 {session.panes.length===2&&<IconButton name="close" label={'Close pane '+(index+1)} onClick={()=>closePane(pane.id)}/>}
 </div></div>
 {view&&loc?.collectionId?<CollectionView key={view.id+loc.collectionId} id={loc.collectionId} catalogue={catalogue} workspace={ws} onOpen={(id:string,anchor?:Anchor,newTab=false)=>openPage(id,anchor,newTab,pane.id)} onOther={session.panes.length===2?(id:string)=>{const other=session.panes.find(p=>p.id!==pane.id);if(other)openPage(id,undefined,false,other.id);}:undefined} onManage={(item:any)=>setModal({kind:'manage',item})} onBookmark={bookmarkDocument} onCreate={setModalCreate} onImport={(projectId:string,folderId?:string)=>setModal({kind:'settings',projectId,folderId})}/>:
 view&&loc?<><div className="pane-breadcrumb" title={crumb?.path.join(' / ')??loc.pageId}><span>{crumb?.path.slice(0,-1).join(' / ')??'Unfiled reference'}</span>{session.panes.length===2&&<span className={'pane-active-tag '+(active?'selected':'')}>{(active?'Active pane ':'Pane ')+letter}</span>}</div>
 {page&&isArchived(page.id,catalogue,ws.overlays)&&<div className="archived-banner">This page or its folder is archived. Its content and remarks are retained.</div>}
 {page?doc?<PdfReader key={view.id+doc.id} paneId={pane.id} slotId={slotId} document={doc} location={loc} resolve={assets.url} fetchBytes={assets.bytes} onRenderer={(mode:string)=>setPdfRenderers(prior=>prior[view.id+doc.id]===mode?prior:{...prior,[view.id+doc.id]:mode})} onLocation={(patch:any)=>updateView(pane.id,view.id,v=>{const entry=current(v);if(entry?.pageId===doc.pageId)Object.assign(entry,patch);})}/>:
 <NoteReader key={view.id+page.id} page={page} view={view} location={loc} resolveAsset={assets.inPage} fontSize={session.fontSize} layoutKey={session.theme+'|'+session.focus+'|'+session.panes.length+'|'+session.compactTop+'|'+pane.readerChromeCollapsed+'|'+session.collapsedPane} onAnchor={a=>updateView(pane.id,view.id,v=>{const entry=current(v);if(entry?.pageId===page.id)entry.anchor=a;})} onAction={(action:any,id:any,snippet:any)=>blockAction(action,id,snippet,pane.id,view,page)} onLink={(id:string,anchor?:Anchor,newTab?:boolean)=>openPage(id,anchor,newTab,pane.id)}/>:
 <div className="missing-page"><Icon name="page" size={36}/><h2>This page is not currently available</h2><code>{loc.pageId}</code><p>The view and its saved state have been retained. Import the owning pack, re-enable its content or go Back.</p><div className="button-row"><button onClick={()=>historyStep(-1,pane.id)}>Back</button><button onClick={settings}>Import a library</button></div></div>}</>:
 <div className="empty-pane"><Icon name="book" size={35}/><h2>A new reading thread</h2><p>Choose a page from the notebook tree or search across your library.</p><div className="button-row"><button className="primary" onClick={()=>{activate(pane.id);setModal({kind:'search',paneId:pane.id});}}>Find a page</button><button onClick={()=>{activate(pane.id);settings();}}>Import a library or PDF</button></div></div>}
 </section>;
 }
    function resizeStart(e: any) { if((e.target as HTMLElement).closest('button'))return; captureReaders(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; ratioDraft.current = session.ratio; }
    function resizeMove(e: any) { if (!drag.current || !paneArea.current)
        return; const r = paneArea.current.getBoundingClientRect(); const ratio = Math.max(28, Math.min(72, (e.clientX - r.left) / r.width * 100)); ratioDraft.current = ratio; paneArea.current.style.setProperty('--ratio', ratio + '%'); }
    function resizeEnd() { if (drag.current) {
        drag.current = false;
        setSession(s => { s.ratio = ratioDraft.current; });
    } }
    const promotedTermId=modal?.kind==='pdf-term'?resolveStudy(modal.doc,ws).companion?.terms.find(t=>t.id===modal.term.id)?.globalTermId:undefined;
    const termAlreadyGlobal=!!promotedTermId&&catalogue.glossary.some(t=>t.id===promotedTermId);
    return <><div className={'atlas-app theme-' + session.theme + (session.focus ? ' focus-mode' : '')+(!leftVisible?' sidebar-collapsed':'')} ref={appRef}>

 {store.error && <div className="storage-banner" role="alert"><span>{store.error}</span><button onClick={settings}>Recovery settings</button></div>}{catalogue.warnings.length > 0 && <details className="catalogue-warning"><summary>{catalogue.warnings.length} retained content update warning(s)</summary>{catalogue.warnings.map((s, i) => <p key={i}>{s}</p>)}</details>}
 <div className="workspace-frame">
 {leftVisible && <ProjectTree onReadingActions={showReadingActions} onReadLater={(id:string,title:string)=>void saveTarget('later',targetForPage(catalogue,id),title).catch(()=>{})} navigation={navigation()} onPdfToggle={(key:string)=>setSession(s=>{const keys=s.pdfTreeExpanded??[];s.pdfTreeExpanded=keys.includes(key)?keys.filter(x=>x!==key):[...keys,key];})} onPdfNavigate={pdfNavigate} onPdfTerm={(doc:any,term:any)=>setModal({kind:'pdf-term',doc,term})} onPdfManage={(doc:any)=>setModal({kind:'companion',doc})} onWorkspace={switchWorkspace} onCategory={(category:any)=>setSession(s=>{s.categoryFilter=s.categoryFilter===category?null:category;})} onSidebar={sidebar} onPaneMarker={selectMarker} onGroupToggle={(id:string)=>setSession(s=>{s.collapsedGroups=s.collapsedGroups?.includes(id)?s.collapsedGroups.filter(x=>x!==id):[...(s.collapsedGroups??[]),id];})} catalogue={catalogue} workspace={ws} panePages={session.panes.map(p=>current(p.views.find(v=>v.id===p.active))?.pageId)} activePaneIndex={session.panes.findIndex(p=>p.id===session.activePane)} activePage={session.screen === 'reader' ? activeLocation?.pageId : undefined} onCollection={openPage} onOpen={openPage} onOther={session.panes.length === 2 ? openOther : undefined} onBookmark={bookmarkDocument} onToggle={(id: string) => setSession(s => { s.expanded = s.expanded.includes(id) ? s.expanded.filter(x => x !== id) : [...s.expanded, id]; })} onItem={(item: any) => setModal({ kind: 'manage', item })} onCreate={setModalCreate}/>}
 <>{!leftVisible&&!session.focus&&<div className="navigation-dock">{navigation()}</div>}</><div className="workspace-main">{session.screen === 'home' ? <Home catalogue={catalogue} workspace={ws} onOpen={openPage} onCreate={setModalCreate} onManage={(item: any) => setModal({ kind: 'manage', item })} onPdfManage={()=>{const doc=catalogue.documents.find(d=>d.pageId===activePage?.id);if(doc)setModal({kind:'companion',doc});}} onSettings={settings} onRestore={onRestore} onGroup={() => setModal({ kind: 'groups' })}/> : session.screen === 'bookmarks' ? <main className="bookmark-page"><div className="eyebrow">SAVED READING POSITIONS</div><h1>Your bookmarks</h1><p>Bookmarks point to source blocks, not generated Book sheet numbers.</p>{ws.personal.bookmarks.length ? ws.personal.bookmarks.map(b => <article key={b.id} className="bookmark-card"><button onClick={() => openTarget(bookmarkTarget(b))}><Icon name="bookmark"/><span><strong>{b.title}</strong><small>{locs.get(b.pageId)?.path.join(' / ') ?? 'Unresolved page - owning pack may be missing'}{b.anchor?.blockId ? ' / Block ' + b.anchor.blockId.slice(-10) : ''}{b.anchor?.pdfPage ? ' / PDF page ' + b.anchor.pdfPage : ''}</small></span></button><IconButton name="close" label={'Remove bookmark ' + b.title} onClick={() => store.personal(p => { p.bookmarks = p.bookmarks.filter(x => x.id !== b.id); })}/></article>) : <div className="empty-state"><Icon name="bookmark" size={40}/><h2>Keep a place for later.</h2><p>Open a page and use its bookmark button to save the current reading position.</p></div>}</main> : <>{session.panes.length === 2 && <div className="mobile-pane-switch">{session.panes.map((p, i) => <button key={p.id} className={p.id === mobilePane ? 'selected' : ''} onClick={() => activate(p.id)}>Pane {i + 1}</button>)}</div>}<div className="panes" ref={paneArea} style={({ '--ratio': session.ratio + '%' } as any)}>{session.panes.map((p, i) => <React.Fragment key={p.id}>{i === 1 && !session.collapsedPane && <div className="pane-divider" role="separator" aria-label="Resize comparison panes" aria-orientation="vertical" aria-valuemin={28} aria-valuemax={72} aria-valuenow={Math.round(session.ratio)} tabIndex={0} onPointerDown={resizeStart} onPointerMove={resizeMove} onPointerUp={resizeEnd} onPointerCancel={resizeEnd} onKeyDown={e => { if(e.target!==e.currentTarget)return; if (['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) {
        e.preventDefault();
        setSession(s => { s.ratio = e.key === 'Home' ? 50 : Math.max(28, Math.min(72, s.ratio + (e.key === 'ArrowRight' ? 2 : -2))); });
    } }}><span /></div>}{renderPane(p, i)}</React.Fragment>)}</div></>}
 </div><ReaderRail slotId={slotId} stateBusy={stateBusy} hasWorkspaceSave={!!latestStateSave(ws.personal,slotId)} hasAppSave={!!latestStateSave(ws.personal,'all')} onSaveWorkspace={()=>void saveState(slotId)} onRestoreWorkspace={()=>{const e=latestStateSave(ws.personal,slotId);if(e)void restoreState(e.id);}} onSaveApp={()=>void saveState('all')} onRestoreApp={()=>{const e=latestStateSave(ws.personal,'all');if(e)void restoreState(e.id);}} onSavedStates={()=>{openManager('context');setContextTab('workspace');}} onReadLater={()=>openManager('later')} managerMode={rightVisible?managerMode:null} onExport={()=>setModal({kind:'export'})} pdfRenderer={pdfRenderers[(activeView?.id??'')+(catalogue.documents.find(d=>d.pageId===activePage?.id)?.id??'')]} session={session} page={activePage} view={activeView} location={activeLocation} doc={catalogue.documents.find(d=>d.pageId===activePage?.id)} leftVisible={leftVisible} contextOpen={rightVisible} popover={popover} setPopover={(value:RailPopover)=>{if(value)setContextOpen(false);setPopover(value);}}
 onTree={()=>{setSession(s=>{s.leftOpen=small?true:!leftVisible;});if(small)setMobileSide(mobileSide==='left'?'':'left');}}
 onFocus={toggleFocus} onContext={()=>{setPopover(null);setManagerMode('context');setContextOpen(!contextOpen||managerMode!=='context');}} onCompare={compare} onSwap={()=>setSession(s=>{s.panes.reverse();s.ratio=100-s.ratio;})}
 onBookmark={()=>{if(activePage&&activeView){captureReaders();const fresh=activeSession(store.state.personal).panes.find(p=>p.id===activePane.id)?.views.find(v=>v.id===activeView.id);if(fresh)bookmark(activePage,fresh);}}}
 onTheme={(theme:Session['theme'])=>setSession(s=>{s.theme=theme;})} onView={(fn:(v:View)=>void)=>{if(activePane&&activeView)updateView(activePane.id,activeView.id,fn);}}
 onPdfManage={()=>{const doc=catalogue.documents.find(d=>d.pageId===activePage?.id);if(doc)setModal({kind:'companion',doc});}} onSettings={settings} onHome={()=>setSession(s=>{s.screen='home';})} onBookmarks={()=>openManager('bookmark')} onEdit={()=>setModal({kind:'edit',page:activePage})} onPrint={()=>setModal({kind:'print'})}
 onFlags={()=>setSession(s=>{s.showFlags=!s.showFlags;})} rating={activePage?ws.personal.ratings[activePage.id]:undefined} onRating={(rating:any)=>{if(activePage)store.personal(p=>{p.ratings[activePage.id]=rating;});}}/>
 {rightVisible&&<FloatingPanel title={managerMode==='context'?'Context':managerMode==='bookmark'?'Bookmarks':'Read later'} className={'context-drawer manager-drawer manager-'+managerMode} onClose={()=>setContextOpen(false)}>{managerPanel()}</FloatingPanel>}
 {readingMenu&&<ReadingActions key={readingMenu.target.kind+readingMenu.title} menu={readingMenu} onClose={()=>setReadingMenu(null)} onOpen={where=>openTarget(readingMenu.target,where)} onLater={()=>void saveTarget('later',readingMenu.target,readingMenu.title).catch(()=>{})} onBookmark={()=>void saveTarget('bookmark',readingMenu.target,readingMenu.title).catch(()=>{})}/>}

 </div><footer className="statusbar"><span><span className="status-dot"/> {discoveryCounts.projects} notebooks / {discoveryCounts.pages} {session.libraryMode==='pdfs'?'PDFs':'notes'} / {catalogue.glossary.length} {catalogue.glossary.length === 1 ? 'term' : 'terms'}</span><span>Local workspace <span className="status-separator">/</span> No cloud sync</span></footer>{toast.text && <div className={'toast ' + (toast.error ? 'error' : '')} role={toast.error ? 'alert' : 'status'}>{toast.error ? <Icon name="help"/> : <Icon name="check"/>}<span>{toast.text}</span><IconButton name="close" label="Dismiss message" onClick={() => setToast({ text: '', error: false })}/></div>}
 {session.focus&&<button className="exit-focus" aria-label="Exit focus" onClick={toggleFocus}><Icon name="focus" size={15}/>Exit focus <kbd>Esc</kbd></button>}
 </div>
 {modal?.kind==='saved-states'&&<SavedStatesDialog personal={ws.personal} busy={stateBusy} onClose={()=>setModal(null)} onSave={saveState} onRestore={restoreState} onRename={(id,title,note)=>savedStateAction((p:any)=>renameReadingState(p,id,title,note),'Save details updated.')} onDelete={(id)=>savedStateAction((p:any)=>deleteReadingState(p,id),'Saved state deleted. Notes and PDFs are unchanged.')}/>}
 {modal?.kind==='companion'&&<CompanionPanel onInspectTerm={term=>setModal({kind:'pdf-term',doc:modal.doc,term})} managerOnly onClose={()=>setModal(null)} document={modal.doc} physicalPage={activeLocation?.pageId===modal.doc.pageId?(activeLocation?.pdfPage??1):1} paneId={activePane?.id} slotId={slotId} onNavigate={n=>pdfNavigate(modal.doc.pageId,n)} prepare={activeLocation?.pageId===modal.doc.pageId&&pdfRenderers[(activeView?.id??'')+modal.doc.id]==='integrated'?prepareOpenPdf(slotId,activePane.id,modal.doc.id):undefined}/>}
 {modal?.kind==='pdf-term'&&<Modal title={modal.term.label} onClose={()=>setModal(null)}><p className="secondary">{modal.doc.title}</p>{modal.term.translation&&<p>{modal.term.translation}</p>}<p className="pdf-term-definition">{modal.term.definition}</p>{modal.term.example&&<p className="secondary">{modal.term.example}</p>}<div className="button-row">{modal.term.pageRefs.map((n:number)=><button key={n} onClick={()=>pdfNavigate(modal.doc.pageId,n)}>Go to PDF page {n}</button>)}</div><div className="dialog-actions"><button disabled={termAlreadyGlobal} onClick={()=>void promoteStudyTerm(modal.doc,modal.term,store).then(()=>{notify('Term added to shared glossary.');setModal(null);}).catch((e:Error)=>notify(e.message,true))}>{termAlreadyGlobal?'In global glossary':'Promote to global glossary'}</button><button onClick={()=>setModal({kind:'companion',doc:modal.doc})}>Manage PDF details</button></div></Modal>}
 {modal?.kind === 'search' && <SearchDialog catalogue={catalogue} onClose={() => setModal(null)} onOpen={(id: string, anchor?: Anchor, newTab = false) => openPage(id, anchor, modal.newTab || newTab, modal.paneId)}/>}
 {modal?.kind === 'settings' && <SettingsDialog built={built} catalogue={catalogue} assets={assets} initialProject={modal.projectId} initialFolder={modal.folderId} onClose={() => setModal(null)} onOpen={openPage} notify={notify}/>}
 {modal?.kind === 'create' && <CreateDialog kind={modal.itemKind} project={modal.project} folder={modal.folder} catalogue={catalogue} onClose={() => setModal(null)} onOpen={openPage} notify={notify}/>}
 {modal?.kind === 'manage' && <ManageDialog item={modal.item} catalogue={catalogue} onClose={() => setModal(null)} onCreate={setModalCreate} onEdit={(id: string) => setModal({ kind: 'edit', page: catalogue.pages.find(p => p.id === id) })} notify={notify}/>}
 {modal?.kind === 'edit' && modal.page && <EditPageDialog page={modal.page} catalogue={catalogue} onClose={() => setModal(null)} notify={notify}/>}
 {modal?.kind === 'groups' && <GroupsDialog catalogue={catalogue} onClose={() => setModal(null)} notify={notify}/>}
 {['export', 'print'].includes(modal?.kind) && activePage && <ExportDialog catalogue={catalogue} page={activePage} view={activeView} onClose={() => setModal(null)} notify={notify} print={modal.kind === 'print'} onPrint={(selection: any) => { setModal(null); setPrintSelection(selection); }}/>}
 {modal?.kind === 'figure' && <Modal title="Figure and provenance" onClose={() => setModal(null)} wide><div className="figure-modal"><ContentUnits page={modal.page} view={modal.view} resolveAsset={assets.inPage}/></div></Modal>}
 {modal?.kind === 'copy' && <Modal title="Copy code" onClose={() => setModal(null)}><p>Clipboard access is unavailable. Select and copy the original full snippet below.</p><textarea className="json-editor" rows={16} readOnly value={modal.text} onFocus={e => e.target.select()} autoFocus/></Modal>}
 {printSelection && <PrintProjection selection={printSelection} resolveAsset={assets.inPage}/>}
 </>;
}
