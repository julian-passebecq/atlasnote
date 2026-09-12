import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from '../vendor/react.mjs';
import type { Page, View, Location, Anchor } from '../core/model.js';
import { ContentUnits, Source } from './blocks.js';
import { IconButton } from '../components/Icon.js';
import { captureReadingAnchor,restoreReadingAnchor } from './anchors.js';
import { paginateDOM } from './pagination.mjs';
export function NoteReader({ page, view, location, resolveAsset, onAnchor, onAction, onLink, fontSize, layoutKey }: {
    page: Page;
    view: View;
    location: Location;
    resolveAsset: any;
    onAnchor: (a: Anchor) => void;
    onAction: any;
    onLink: any;
    fontSize: number;
    layoutKey: string;
}) {
    const host = useRef<HTMLDivElement | null>(null), measure = useRef<HTMLDivElement | null>(null), probe = useRef<HTMLDivElement | null>(null), grid = useRef<HTMLDivElement | null>(null), lastAnchor = useRef<Anchor | undefined>(location.anchor), saved = useRef(''), restore = useRef(false), timer = useRef<any>(null), anchorWriter = useRef(onAnchor);
    anchorWriter.current = onAnchor;
    const [size, setSize] = useState({ width: 0, height: 0 }), [revision, setRevision] = useState(0), [book, setBook] = useState({ count: 0, current: 1, columns: 1, error: '', fallbacks: 0 });
    const mode = location.presentation, bookMode = mode === 'book';
    const disclosure = JSON.stringify([view.collapsed, view.revealed, view.english]);
    const ready = useCallback(() => setRevision(x => x + 1), []);
    useLayoutEffect(() => { const el = host.current!; const observer = new ResizeObserver(() => { const r = el.getBoundingClientRect(); setSize(s => Math.abs(s.width - r.width) > 1 || Math.abs(s.height - r.height) > 1 ? { width: r.width, height: r.height } : s); }); observer.observe(el); return () => observer.disconnect(); }, []);
    useEffect(() => { document.fonts?.ready.then(ready); }, []);
    useEffect(()=>{
        const capture=()=>{if(!host.current)return;const a=lastAnchor.current??(host.current.scrollTop>0&&!restore.current?captureReadingAnchor(host.current):undefined);if(!a)return;lastAnchor.current=a;clearTimeout(timer.current);const key=JSON.stringify(a);if(saved.current!==key){saved.current=key;anchorWriter.current(a);}};
        document.addEventListener('atlas:before-reader-change',capture);
        return()=>document.removeEventListener('atlas:before-reader-change',capture);
    },[]);
    useLayoutEffect(()=>{
        if(bookMode||!size.width||!host.current)return;
        restore.current=true;const anchor=lastAnchor.current??location.anchor;
        let frame2=0;const frame=requestAnimationFrame(()=>{if(host.current)restoreReadingAnchor(host.current,anchor);frame2=requestAnimationFrame(()=>{restore.current=false;});});
        return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(frame2);};
    },[bookMode,size.width,size.height,fontSize,layoutKey,disclosure]);

    useLayoutEffect(() => { lastAnchor.current = location.anchor; restore.current = true; saved.current = ''; if (!bookMode) {
        const el = host.current!;
        el.scrollTop = 0;
        requestAnimationFrame(() => { if (location.anchor)
            restoreReadingAnchor(el, location.anchor); restore.current = false; });
    } }, [page.id, mode]);
    useLayoutEffect(() => { if (!bookMode || !size.width || !size.height || !measure.current || !grid.current || !probe.current)
        return; const el = host.current!, oldAnchor = lastAnchor.current ?? location.anchor ?? captureReadingAnchor(el); const columns = size.width >= 920 ? 2 : 1, outerWidth = (size.width - 40 - (columns - 1) * 20) / columns, contentWidth = outerWidth - 48, bodyHeight = Math.max(180, size.height - 126); restore.current = true; clearTimeout(timer.current); measure.current.style.width = contentWidth + 'px'; probe.current.style.width = contentWidth + 'px'; const seq = setTimeout(() => { try {
        const r = paginateDOM(measure.current!, probe.current!, { height: bodyHeight, width: contentWidth, title: page.title });
        grid.current!.style.gridTemplateColumns = `repeat(${columns},minmax(0,1fr))`;
        grid.current!.replaceChildren(r.fragment);
        grid.current!.dataset.ready = 'true';
        setBook(b => ({ ...b, count: r.count, columns, error: '', fallbacks: r.fallbacks.length }));
        requestAnimationFrame(() => { if (oldAnchor) {
            restoreReadingAnchor(el, oldAnchor);
            lastAnchor.current = oldAnchor;
            saved.current = JSON.stringify(oldAnchor);
        } requestAnimationFrame(() => { restore.current = false; updatePosition(true); }); });
    }
    catch (e) {
        setBook(b => ({ ...b, error: (e as Error).message }));
        restore.current = false;
    } }, 60); return () => clearTimeout(seq); }, [bookMode, size.width, size.height, page, disclosure, revision, fontSize, layoutKey]);
    useEffect(() => { if (!location.anchor?.blockId)
        return; const key = JSON.stringify(location.anchor); if (saved.current === key)
        return; lastAnchor.current = location.anchor; const t = setTimeout(() => { if (host.current)
        restoreReadingAnchor(host.current, location.anchor); }, 80); return () => clearTimeout(t); }, [JSON.stringify(location.anchor), page.id]);
    useEffect(() => () => { clearTimeout(timer.current); const a = lastAnchor.current, write = anchorWriter.current; if (a && saved.current !== JSON.stringify(a))
        queueMicrotask(() => write(a)); }, []);
    function updatePosition(preserveAnchor = false) {
        if (!host.current || restore.current)
            return;
        const anchor = captureReadingAnchor(host.current);
        if (anchor && !preserveAnchor)
            lastAnchor.current = anchor;
        if (bookMode) {
            const rect = host.current.getBoundingClientRect(), sheets = [...host.current.querySelectorAll<HTMLElement>('[data-sheet]')];
            const first = sheets.find(s => s.getBoundingClientRect().bottom > rect.top + 45);
            if (first) {
                const n = Number(first.dataset.sheet);
                setBook(b => b.current === n ? b : { ...b, current: n });
            }
        }
        if (preserveAnchor)
            return;
        clearTimeout(timer.current);
        const pageAtSchedule = page.id;
        timer.current = setTimeout(() => { if (anchor && pageAtSchedule === page.id) {
            saved.current = JSON.stringify(anchor);
            onAnchor(anchor);
        } }, 250);
    }
    function click(e: any) { const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action],[data-page]'); if (!target)
        return; if (target.dataset.page) {
        e.preventDefault();
        onLink(target.dataset.page, target.dataset.anchor ? { blockId: target.dataset.anchor } : undefined, e.ctrlKey || e.metaKey || e.button === 1);
        return;
    } const action = target.dataset.action; if (action === 'load-image' && bookMode) {
        const original = [...measure.current!.querySelectorAll<HTMLElement>('[data-action="load-image"]')].find(n => n.dataset.block === target.dataset.block);
        original?.click();
        return;
    } onAction(action, target.dataset.block, target.dataset.snippet); }
    function scrollRow(delta: number) { const el = host.current!, currentSheet = book.current + delta * book.columns, target = el.querySelector<HTMLElement>(`[data-sheet="${Math.max(1, Math.min(book.count, currentSheet))}"]`); if (target)
        el.scrollTo({ top: target.offsetTop - 20, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    const title = <header className="note-heading"><div className="eyebrow">{page.tags.slice(0, 3).join(' / ') || 'NOTEBOOK'}</div><h1>{page.title}</h1><p>{page.summary}</p></header>;
    return <div className={'reader-body ' + mode} style={{ fontSize: fontSize + 'px' }} onClick={click} onAuxClick={e => { if (e.button === 1)
        click(e); }}>
 <div className={'note-scroller ' + (bookMode ? 'book-scroller' : '')} ref={host} onScroll={() => updatePosition()} tabIndex={0} aria-label={bookMode ? 'Book sheets' : 'Note reading area'} onKeyDown={e => { if (!bookMode || ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName))
        return; if (e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault();
        scrollRow(e.key === 'PageDown' ? 1 : -1);
    } }}>
 {bookMode ? <><div className="book-grid" ref={grid}/>{book.error && <div className="book-error" role="alert">{book.error}<button data-action="continuous-block" data-block={lastAnchor.current?.blockId}>Open Continuous</button></div>}<div className="book-measure" ref={measure} aria-hidden="true" inert=""><div className="content-unit unit-heading" data-kind="heading" data-block-id={page.id}>{title}</div><ContentUnits page={page} view={view} resolveAsset={resolveAsset} onReady={ready}/>{page.sources.length > 0 && <div className="content-unit unit-sources" data-kind="sources" data-block-id={page.id} data-offset="999999"><footer className="page-sources"><h3>Sources &amp; provenance</h3>{page.sources.map((s, i) => <div key={i}><Source source={s}/></div>)}</footer></div>}</div><div className="book-probe" ref={probe} aria-hidden="true" inert=""/></> : <article className="continuous-content">{title}<ContentUnits page={page} view={view} resolveAsset={resolveAsset} onReady={ready}/>{page.sources.length > 0 && <footer className="page-sources"><h3>Sources &amp; provenance</h3>{page.sources.map((s, i) => <div key={i}><Source source={s}/></div>)}</footer>}</article>}
 </div>
 {bookMode && <div className="book-status"><span><strong>{book.current}{book.columns === 2 && book.current < book.count ? '-' + Math.min(book.current + 1, book.count) : ''} / {book.count || '...'}</strong> sheets <span className="secondary">Same note</span></span>{book.fallbacks > 0 && <small>{book.fallbacks} oversized block(s) have a full-view link</small>}<span className="button-row"><IconButton name="left" label="Previous book spread" onClick={() => scrollRow(-1)} disabled={book.current <= 1}/><IconButton name="right" label="Next book spread" onClick={() => scrollRow(1)} disabled={book.current + book.columns > book.count}/></span></div>}
 </div>;
}
