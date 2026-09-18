import React, {useRef, useState, useEffect, useLayoutEffect} from '../vendor/react.mjs';
import type {ReadingTarget, ReadingDestination} from '../core/reading-types.js';
import {Icon} from './Icon.js';
import {focusFirstMenuItem, moveMenuFocus} from './menu-navigation.js';
import {HistoryMenuItems} from '../history/HistoryMenuItems.js';
import type {HistoryMenuActions} from '../history/HistoryMenuItems.js';
import type {HistoryUIContext} from '../history/ui-context.js';
import {historyIdentityAttributes} from '../history/ui-context.js';

export type ReadingActionMenu = {target: ReadingTarget; title: string; x: number; y: number; origin: HTMLElement; semanticReference?: boolean};
type Props = HistoryMenuActions & {
 menu: ReadingActionMenu;
 historyContext?: HistoryUIContext;
 onClose: () => void;
 onOpen: (where: ReadingDestination) => void;
 onLater: () => void;
 onBookmark: () => void;
};

export function ReadingActions({menu, historyContext, onClose, onOpen, onLater, onBookmark, onHistory, onComparePrevious, onOpenPrevious}: Props) {
 const ref = useRef<HTMLDivElement | null>(null);
 const [choosing, setChoosing] = useState(false);
 function close(restoreFocus = true) {
  onClose();
  if (restoreFocus && menu.origin.isConnected) menu.origin.focus();
 }
 // Restore the trigger before opening a dialog so its own focus restoration
 // targets the real tree/card button rather than an unmounted menu entry.
 function action(fn: () => void) { close(); fn(); }
 function navigate(destination: ReadingDestination) {
  close(false); onOpen(destination);
  // Navigation transfers focus to the destination. Leaving the source trigger
  // focused lets a later dialog restore focus into the wrong pane.
  requestAnimationFrame(() => document.querySelector<HTMLElement>(
   '.document-pane.active-pane .document-tab[aria-selected="true"]'
  )?.focus());
 }
 useLayoutEffect(() => {
  const el = ref.current;
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.left = Math.max(8, Math.min(menu.x, innerWidth - r.width - 8)) + 'px';
  el.style.top = Math.max(8, Math.min(menu.y, innerHeight - r.height - 8)) + 'px';
  focusFirstMenuItem(el);
 }, [choosing, menu]);
 useEffect(() => {
  const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) close(false); };
  const resize = () => close(false);
  document.addEventListener('pointerdown', outside);
  window.addEventListener('resize', resize);
  return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize); };
 }, [menu]);
 function key(event: any) {
  if (event.key === 'Escape') {
   event.preventDefault(); event.stopPropagation();
   if (choosing) setChoosing(false); else close();
  } else if (event.key === 'Tab') close(false);
  else if (moveMenuFocus(ref.current, event.key)) { event.preventDefault(); event.stopPropagation(); }
 }
 return <div ref={ref} className="reading-action-menu" role="menu" aria-label={'Reading actions for ' + menu.title}
  {...historyIdentityAttributes(historyContext)} onKeyDown={key}>
  <strong>{menu.title}</strong>
  {choosing ? <>
   <small>Add a tab without replacing existing work.</small>
   {([1, 2, 3, 4, 5] as const).map(n => <button role="menuitem" key={n} data-agent-action="resource-open"
    data-destination="workspace" data-workspace-id={n} onClick={() => navigate(n)}>Open in Workspace {n}</button>)}
   <button role="menuitem" data-agent-action="destination-back" onClick={() => setChoosing(false)}>Back</button>
  </> : <>
   {menu.target.kind === 'url' ? <a role="menuitem" href={menu.target.url} target="_blank" rel="noopener noreferrer" onClick={() => close()}>Open external link</a> : <>
    <button role="menuitem" data-agent-action="resource-open" data-destination="here" onClick={() => navigate('here')}><Icon name="page" />Open here</button>
    {menu.target.kind !== 'dashboard-item' && <>
     <button role="menuitem" data-agent-action="resource-open" data-destination="tab" onClick={() => navigate('tab')}><Icon name="plus" />Open in new tab</button>
     <button role="menuitem" data-agent-action="resource-open" data-destination="pane" onClick={() => navigate('pane')}><Icon name="compare" />Open in other pane</button>
     <button role="menuitem" data-agent-action="resource-open" data-destination="pane" onClick={() => navigate('pane')}><Icon name="plus" />Open in new tab in other pane</button>
    </>}
    <button role="menuitem" data-agent-action="choose-destination" onClick={() => setChoosing(true)}><Icon name="panel" />Open in workspace...</button>
   </>}
   <HistoryMenuItems context={historyContext}
    onHistory={onHistory ? key => action(() => onHistory(key)) : undefined}
    onComparePrevious={onComparePrevious ? (key, revision) => action(() => onComparePrevious(key, revision)) : undefined}
    onOpenPrevious={onOpenPrevious ? (key, revision) => action(() => onOpenPrevious(key, revision)) : undefined} />
   <div role="separator" />
   <button role="menuitem" data-agent-action="read-later-add" onClick={() => action(onLater)}><Icon name="clock" />Add to Read later</button>
   {menu.target.kind !== 'url' && <button role="menuitem" data-agent-action="bookmark-add" onClick={() => action(onBookmark)}><Icon name="bookmark" />Bookmark</button>}
  </>}
 </div>;
}
