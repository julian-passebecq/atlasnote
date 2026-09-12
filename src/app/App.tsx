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
import {ReaderRail} from '../components/ReaderRail.js';
import type {RailPopover} from '../components/ReaderRail.js';
import {FloatingPanel} from '../components/FloatingPanel.js';
import { assetResolver } from './assets.js';
export function App({ built }: any) {
    const ws = useSyncExternalStore(store.subscribe, store.getSnapshot), session = ws.personal.session;
    const catalogue = useMemo(() => compose(built, ws), [built, ws.imports, ws.overlays]), catalogueRef = useRef(catalogue);
    catalogueRef.current = catalogue;
    useEffect(()=>{document.documentElement.dataset.theme=session.theme;},[session.theme]);
    const assets = useMemo(() => assetResolver(built, () => catalogueRef.current), [built]);
    const locs = useMemo(() => locations(catalogue), [catalogue]);
    const activePane = session.panes.find(p => p.id === session.activePane) ?? session.panes[0], activeView = activePane?.views.find(v => v.id === activePane.active), activeLocation = current(activeView), activePage = catalogue.pages.find(p => p.id === activeLocation?.pageId);
    const [modal, setModal] = useState<any>(null), [toast, setToast] = useState({ text: '', error: false }), [printSelection, setPrintSelection] = useState<any>(null), [mobilePane, setMobilePane] = useState(session.activePane);
    const [contextOpen,setContextOpen]=useState(false),[popover,setPopover]=useState<RailPopover>(null);
    const [small, setSmall] = useState(window.innerWidth < 900), [mobileSide, setMobileSide] = useState('');
    useEffect(() => { const f = () => setSmall(window.innerWidth < 900); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
    useEffect(() => { setMobilePane(session.activePane); }, [session.activePane]);
    const appRef = useRef<HTMLDivElement | null>(null), paneArea = useRef<HTMLDivElement | null>(null), drag = useRef(false), ratioDraft = useRef(session.ratio);
    function notify(text: string, error = false) { setToast({ text, error }); }
    useEffect(() => { if (!toast.text)
        return; const t = setTimeout(() => setToast({ text: '', error: false }), 6500); return () => clearTimeout(t); }, [toast]);
    const capturingReaders=useRef(false);
    function captureReaders(){if(capturingReaders.current)return;capturingReaders.current=true;try{document.dispatchEvent(new Event('atlas:before-reader-change'));}finally{capturingReaders.current=false;}}
    function setSession(fn: (s: Session) => void) {captureReaders();store.personal(p => fn(p.session));}
    function freshTab(paneId:string){const pane=store.state.personal.session.panes.find(p=>p.id===paneId);if(!pane)return;if(pane.views.length>=5){notify('Keep up to five tabs in each pane. Close a tab before opening another.');return;}setSession(s=>{const p=s.panes.find(p=>p.id===paneId)!;const v=newView();p.views.push(v);p.active=v.id;s.activePane=p.id;s.screen='reader';});}
    function toggleFocus(){setContextOpen(false);setPopover(null);setSession(s=>{s.focus=!s.focus;});}

    function updateView(paneId: string, viewId: string, fn: (v: View) => void) { setSession(s => { const v = s.panes.find(p => p.id === paneId)?.views.find(v => v.id === viewId); if (v)
        fn(v); }); }
    function activate(paneId: string) { if (store.state.personal.session.activePane !== paneId)
        setSession(s => { s.activePane = paneId; }); setMobilePane(paneId); }
    function exposePage(s: Session, id: string) { const loc = locations(catalogueRef.current).get(id); for (const branch of loc?.ancestors ?? [])
        if (!s.expanded.includes(branch))
            s.expanded.push(branch); }
    function openPage(id: string, anchor?: Anchor, newTab = false, paneId?: string, presentation?: Location['presentation']) { const target = paneId ?? store.state.personal.session.activePane; const c = catalogueRef.current; let blocked = false; setSession(s => { let pane = s.panes.find(p => p.id === target) ?? s.panes[0]; if (!pane) {
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
    } s.activePane = pane.id; s.screen = 'reader'; exposePage(s, id); const view = pane.views.find(v => v.id === pane.active)!; if(collectionTarget(c,id))current(view)!.collectionId=id; if (presentation)
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
        return; pane.views[index] = travel(pane.views[index], delta); s.activePane = pane.id; s.screen = 'reader'; exposePage(s, current(pane.views[index])!.pageId); }); }
    function closeTab(paneId: string, viewId: string) { setSession(s => { const pane = s.panes.find(p => p.id === paneId)!; const index = pane.views.findIndex(v => v.id === viewId); pane.views.splice(index, 1); if (pane.active === viewId)
        pane.active = pane.views[Math.min(index, pane.views.length - 1)]?.id ?? ''; if (s.panes.every(p => !p.views.length))
        s.screen = 'home'; }); }
    function compare() { setSession(s => { toggleCompare(s); setMobilePane(s.activePane); }); }
    function bookmarkDocument(id: string) { const page = catalogueRef.current.pages.find(p => p.id === id); if (!page)
        return; store.personal(p => { const found = p.bookmarks.find(b => b.pageId === id && !b.anchor); if (found)
        p.bookmarks = p.bookmarks.filter(b => b.id !== found.id);
    else
        p.bookmarks.push({ id: uid('bookmark'), pageId: id, title: page.title, createdAt: Date.now() }); }); notify('Document bookmark updated.'); }
    function openOther(id: string) { const s = store.state.personal.session, other = s.panes.find(p => p.id !== s.activePane); if (other)
        openPage(id, undefined, false, other.id); }
    function closePane(id: string) { setSession(s => { if (s.panes.length === 1)
        return; s.panes = s.panes.filter(p => p.id !== id); s.activePane = s.panes[0].id; if (!s.panes[0].views.length)
        s.screen = 'home'; setMobilePane(s.activePane); }); }
    function bookmark(page: Page, view: View) { const loc = current(view)!, anchor = loc.anchor; store.personal(p => { const found = p.bookmarks.find(b => b.pageId === page.id && JSON.stringify(b.anchor ?? {}) === JSON.stringify(anchor ?? {})); if (found)
        p.bookmarks = p.bookmarks.filter(b => b.id !== found.id);
    else
        p.bookmarks.push({ id: uid('bookmark'), pageId: page.id, title: page.title, anchor: structuredClone(anchor), createdAt: Date.now() }); }); notify('Bookmarks updated.'); }
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
        const onHash=(initial=false)=>{try{const route=parseHashRoute(location.hash);if(route&&(!initial||shouldOpenStartupRoute(store.state.personal.session,route)))openPage(route.id,route.anchor);}catch{notify('This page link is malformed.',true);}};
        onHash(true);const changed=()=>onHash(false);window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);
    }, []);
    useEffect(() => { const key = (e: KeyboardEvent) => { const s = store.state.personal.session; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
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
        const view = pane.views.find(v => v.id === pane.active), loc = current(view), page = catalogue.pages.find(p => p.id === loc?.pageId), doc = catalogue.documents.find(d => d.pageId === page?.id), crumb = page ? locs.get(page.id) : undefined, active = pane.id === session.activePane;
        return <section key={pane.id} data-pane-id={pane.id} data-pane-slot={index===0?'a':'b'} className={'document-pane ' + (active ? 'active-pane ' : '') + (session.panes.length === 2 && pane.id !== mobilePane ? 'mobile-inactive' : '')} style={session.panes.length === 2 ? { flex: '0 0 ' + (index === 0 ? 'calc(var(--ratio,50%) - 4px)' : 'calc(100% - var(--ratio,50%) - 4px)') } : { flex: '1' }} onPointerDownCapture={() => activate(pane.id)} onFocusCapture={() => activate(pane.id)} aria-label={session.panes.length === 2 ? 'Reading pane ' + (index + 1) : 'Reading pane'}>
 <div className="pane-tabbar">{session.panes.length===2&&<span className={'pane-identity '+(active?'is-active':'')} title={'Pane '+(index===0?'A':'B')+(active?', active':'')} aria-label={'Pane '+(index===0?'A':'B')+(active?', active':'')}>{index===0?'A':'B'}{active&&<span aria-hidden="true">*</span>}</span>}<div className="tab-list" role="tablist" aria-label={'Document tabs in pane ' + (index + 1)}>{pane.views.map(v => { const route=current(v),p=catalogue.pages.find(p=>p.id===route?.pageId),pl=p?locs.get(p.id):undefined,collection=route?.collectionId?collectionTarget(catalogue,route.collectionId):undefined; return <div role="tab" aria-selected={v.id === pane.active} tabIndex={v.id === pane.active ? 0 : -1} className={'document-tab ' + (v.id === pane.active ? 'selected' : '')} key={v.id} title={pl?.path.join(' / ') ?? p?.title ?? current(v)?.pageId} onClick={() => setSession(s => { const p = s.panes.find(p => p.id === pane.id)!; p.active = v.id; s.activePane = pane.id; s.screen = 'reader'; })} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSession(s => { s.panes.find(p => p.id === pane.id)!.active = v.id; s.activePane = pane.id; });
        } if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            const i = pane.views.indexOf(v), next = pane.views[(i + (e.key === 'ArrowRight' ? 1 : -1) + pane.views.length) % pane.views.length];
            setSession(s => { s.panes.find(p => p.id === pane.id)!.active = next.id; });
        } }}><Icon name={catalogue.documents.some(d=>d.pageId===p?.id)?'pdf':pl?.project.icon ?? 'page'} size={15}/><span>{p?.title ?? collection?.title ?? (route?'Unavailable':'New tab')}</span><button className="tab-close" aria-label={'Close tab ' + (p?.title ?? collection?.title ?? 'new tab')} onClick={e => { e.stopPropagation(); closeTab(pane.id, v.id); }}><Icon name="close" size={13}/></button></div>; })}</div><IconButton name="plus" label={'New tab in pane ' + (index + 1)} onClick={() => freshTab(pane.id)}/>{session.panes.length === 2 && <IconButton name="close" label={'Close pane ' + (index + 1)} onClick={() => closePane(pane.id)}/>}</div>
 {view && loc?.collectionId ? <CollectionView key={view.id+loc.collectionId} id={loc.collectionId} catalogue={catalogue} workspace={ws} onOpen={(id:string,anchor?:Anchor,newTab=false)=>openPage(id,anchor,newTab,pane.id)} onOther={session.panes.length===2?(id:string)=>{const other=session.panes.find(p=>p.id!==pane.id);if(other)openPage(id,undefined,false,other.id);}:undefined} onManage={(item:any)=>setModal({kind:'manage',item})} onBookmark={bookmarkDocument} onCreate={setModalCreate} onImport={(projectId:string,folderId?:string)=>setModal({kind:'settings',projectId,folderId})}/> : view && loc ? <><div className="pane-breadcrumb" title={crumb?.path.join(' / ') ?? loc.pageId}><span>{crumb?.path.slice(0, -1).join(' / ') ?? 'Unfiled reference'}</span>{session.panes.length === 2 && <span className={'pane-active-tag ' + (active ? 'selected' : '')}>{(active?'Active pane ':'Pane ')+(index===0?'A':'B')}</span>}</div>{page ? isArchived(page.id, catalogue, ws.overlays) && <div className="archived-banner">This page or its folder is archived. Its content and remarks are retained.</div> : null}{page ? doc ? <PdfReader key={view.id + doc.id} document={doc} location={loc} resolve={assets.url} fetchBytes={assets.bytes} onLocation={(patch: any) => updateView(pane.id, view.id, v => Object.assign(current(v)!, patch))}/> : <NoteReader key={view.id + page.id} page={page} view={view} location={loc} resolveAsset={assets.inPage} fontSize={session.fontSize} layoutKey={session.theme+'|'+session.focus+'|'+session.panes.length} onAnchor={a => updateView(pane.id, view.id, v => { const entry = v.history[view.cursor]; if (entry?.pageId === page.id)
            entry.anchor = a; })} onAction={(action: any, id: any, snippet: any) => blockAction(action, id, snippet, pane.id, view, page)} onLink={(id: string, anchor?: Anchor, newTab?: boolean) => openPage(id, anchor, newTab, pane.id)}/> : <div className="missing-page"><Icon name="page" size={36}/><h2>This page is not currently available</h2><code>{loc.pageId}</code><p>The view and its saved state have been retained. Import the owning pack, re-enable its content or go Back.</p><div className="button-row"><button onClick={() => historyStep(-1, pane.id)}>Back</button><button onClick={settings}>Import a library</button></div></div>}</> : <div className="empty-pane"><Icon name="book" size={35}/><h2>A new reading thread</h2><p>Choose a page from the notebook tree or search across your library.</p><div className="button-row"><button className="primary" onClick={() => {activate(pane.id);setModal({ kind: 'search', paneId: pane.id });}}>Find a page</button><button onClick={()=>{activate(pane.id);settings();}}>Import a library or PDF</button></div></div>}
 </section>;
    }
    function resizeStart(e: any) { captureReaders(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = true; ratioDraft.current = session.ratio; }
    function resizeMove(e: any) { if (!drag.current || !paneArea.current)
        return; const r = paneArea.current.getBoundingClientRect(); const ratio = Math.max(28, Math.min(72, (e.clientX - r.left) / r.width * 100)); ratioDraft.current = ratio; paneArea.current.style.setProperty('--ratio', ratio + '%'); }
    function resizeEnd() { if (drag.current) {
        drag.current = false;
        setSession(s => { s.ratio = ratioDraft.current; });
    } }
    return <><div className={'atlas-app theme-' + session.theme + (session.focus ? ' focus-mode' : '')} ref={appRef}>
 <header className="topbar">
 <IconButton name={session.libraryMode==='pdfs'?'pdf':'book'} className="library-mode-switch" label={session.libraryMode==='pdfs'?'Switch to notes':'Switch to PDF library'} active={session.libraryMode==='pdfs'} onClick={()=>{setSession(s=>{s.libraryMode=s.libraryMode==='pdfs'?'notes':'pdfs';s.leftOpen=true;});if(small)setMobileSide('left');}}/>
 <div className="topbar-history"><IconButton name="left" label="Back in active tab" disabled={!activeView||activeView.cursor<=0} onClick={()=>historyStep(-1)}/><IconButton name="right" label="Forward in active tab" disabled={!activeView||activeView.cursor>=activeView.history.length-1} onClick={()=>historyStep(1)}/></div>
 <button className="global-search" aria-label="Global search" title="Search all notes, PDFs and glossary (Ctrl K)" onClick={()=>setModal({kind:'search'})}><Icon name="search" size={17}/><span>Search your knowledge</span><kbd>Ctrl K</kbd></button>
 <IconButton name="export" className="export-button" label="Export to AI" disabled={!activePage} onClick={()=>setModal({kind:'export'})}/>
 </header>
 {store.error && <div className="storage-banner" role="alert"><span>{store.error}</span><button onClick={settings}>Recovery settings</button></div>}{catalogue.warnings.length > 0 && <details className="catalogue-warning"><summary>{catalogue.warnings.length} retained content update warning(s)</summary>{catalogue.warnings.map((s, i) => <p key={i}>{s}</p>)}</details>}
 <div className="workspace-frame">
 {leftVisible && <ProjectTree catalogue={catalogue} workspace={ws} panePages={session.panes.map(p=>current(p.views.find(v=>v.id===p.active))?.pageId)} activePaneIndex={session.panes.findIndex(p=>p.id===session.activePane)} activePage={session.screen === 'reader' ? activeLocation?.pageId : undefined} onCollection={openPage} onOpen={openPage} onOther={session.panes.length === 2 ? openOther : undefined} onBookmark={bookmarkDocument} onToggle={(id: string) => setSession(s => { s.expanded = s.expanded.includes(id) ? s.expanded.filter(x => x !== id) : [...s.expanded, id]; })} onItem={(item: any) => setModal({ kind: 'manage', item })} onCreate={setModalCreate}/>}
 <div className="workspace-main">{session.screen === 'home' ? <Home catalogue={catalogue} workspace={ws} onOpen={openPage} onCreate={setModalCreate} onManage={(item: any) => setModal({ kind: 'manage', item })} onSettings={settings} onRestore={onRestore} onGroup={() => setModal({ kind: 'groups' })}/> : session.screen === 'bookmarks' ? <main className="bookmark-page"><div className="eyebrow">SAVED READING POSITIONS</div><h1>Your bookmarks</h1><p>Bookmarks point to source blocks, not generated Book sheet numbers.</p>{ws.personal.bookmarks.length ? ws.personal.bookmarks.map(b => <article key={b.id} className="bookmark-card"><button onClick={() => openPage(b.pageId, b.anchor)}><Icon name="bookmark"/><span><strong>{catalogue.pages.find(p => p.id === b.pageId)?.title ?? b.title}</strong><small>{locs.get(b.pageId)?.path.join(' / ') ?? 'Unresolved page - owning pack may be missing'}{b.anchor?.blockId ? ' / Block ' + b.anchor.blockId.slice(-10) : ''}{b.anchor?.pdfPage ? ' / PDF page ' + b.anchor.pdfPage : ''}</small></span></button><IconButton name="close" label={'Remove bookmark ' + b.title} onClick={() => store.personal(p => { p.bookmarks = p.bookmarks.filter(x => x.id !== b.id); })}/></article>) : <div className="empty-state"><Icon name="bookmark" size={40}/><h2>Keep a place for later.</h2><p>Open a page and use its bookmark button to save the current reading position.</p></div>}</main> : <>{session.panes.length === 2 && <div className="mobile-pane-switch">{session.panes.map((p, i) => <button key={p.id} className={p.id === mobilePane ? 'selected' : ''} onClick={() => activate(p.id)}>Pane {i + 1}</button>)}</div>}<div className="panes" ref={paneArea} style={{ '--ratio': session.ratio + '%' }}>{session.panes.map((p, i) => <React.Fragment key={p.id}>{i === 1 && <div className="pane-divider" role="separator" aria-label="Resize comparison panes" aria-orientation="vertical" aria-valuemin={28} aria-valuemax={72} aria-valuenow={Math.round(session.ratio)} tabIndex={0} onPointerDown={resizeStart} onPointerMove={resizeMove} onPointerUp={resizeEnd} onPointerCancel={resizeEnd} onKeyDown={e => { if (['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) {
        e.preventDefault();
        setSession(s => { s.ratio = e.key === 'Home' ? 50 : Math.max(28, Math.min(72, s.ratio + (e.key === 'ArrowRight' ? 2 : -2))); });
    } }}><span /></div>}{renderPane(p, i)}</React.Fragment>)}</div></>}
 </div><ReaderRail session={session} page={activePage} view={activeView} location={activeLocation} doc={catalogue.documents.find(d=>d.pageId===activePage?.id)} leftVisible={leftVisible} contextOpen={rightVisible} popover={popover} setPopover={(value:RailPopover)=>{if(value)setContextOpen(false);setPopover(value);}}
 onTree={()=>{setSession(s=>{s.leftOpen=small?true:!leftVisible;});if(small)setMobileSide(mobileSide==='left'?'':'left');}}
 onFocus={toggleFocus} onContext={()=>{setPopover(null);setContextOpen(!contextOpen);}} onCompare={compare} onSwap={()=>setSession(s=>{s.panes.reverse();s.ratio=100-s.ratio;})}
 onBookmark={()=>{if(activePage&&activeView){captureReaders();const fresh=store.state.personal.session.panes.find(p=>p.id===activePane.id)?.views.find(v=>v.id===activeView.id);if(fresh)bookmark(activePage,fresh);}}}
 onTheme={(theme:Session['theme'])=>setSession(s=>{s.theme=theme;})} onView={(fn:(v:View)=>void)=>{if(activePane&&activeView)updateView(activePane.id,activeView.id,fn);}}
 onSettings={settings} onHome={()=>setSession(s=>{s.screen='home';})} onBookmarks={()=>setSession(s=>{s.screen='bookmarks';})} onEdit={()=>setModal({kind:'edit',page:activePage})} onPrint={()=>setModal({kind:'print'})}
 onFlags={()=>setSession(s=>{s.showFlags=!s.showFlags;})} rating={activePage?ws.personal.ratings[activePage.id]:undefined} onRating={(rating:any)=>{if(activePage)store.personal(p=>{p.ratings[activePage.id]=rating;});}}/>
 {rightVisible&&<FloatingPanel title="Context" className="context-drawer" onClose={()=>setContextOpen(false)}><ContextPanel catalogue={catalogue} page={session.screen==='reader'?activePage:undefined} view={activeView} location={activeLocation} workspace={ws} onOpen={openPage} onJump={jump} onClose={()=>setContextOpen(false)} notify={notify}/></FloatingPanel>}

 </div><footer className="statusbar"><span><span className="status-dot"/> {catalogue.projects.length} notebooks / {catalogue.pages.length} pages / {catalogue.glossary.length} {catalogue.glossary.length === 1 ? 'term' : 'terms'}</span><span>Local workspace <span className="status-separator">/</span> No cloud sync</span></footer>{toast.text && <div className={'toast ' + (toast.error ? 'error' : '')} role={toast.error ? 'alert' : 'status'}>{toast.error ? <Icon name="help"/> : <Icon name="check"/>}<span>{toast.text}</span><IconButton name="close" label="Dismiss message" onClick={() => setToast({ text: '', error: false })}/></div>}
 {session.focus&&<button className="exit-focus" aria-label="Exit focus" onClick={toggleFocus}><Icon name="focus" size={15}/>Exit focus <kbd>Esc</kbd></button>}
 </div>
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
