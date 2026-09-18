import React from '../vendor/react.mjs';
import {Icon} from '../components/Icon.js';
import type {HistoryUIContext} from './ui-context.js';
import {historyIdentityAttributes} from './ui-context.js';

export type HistoryMenuActions = {
 onHistory?: (resourceKey: string) => void;
 onComparePrevious?: (resourceKey: string, selectedRevisionId?: string) => void;
 onOpenPrevious?: (resourceKey: string, selectedRevisionId?: string) => void;
};

/** The same three actions are used for Notebook nodes and delegated PDF,
 * Article, Cheatsheet, QCM and reference menus. No second mutation pathway. */
export function HistoryMenuItems({context, onHistory, onComparePrevious, onOpenPrevious}: HistoryMenuActions & {context?: HistoryUIContext}) {
 if (!context || !onHistory) return null;
 const attrs = historyIdentityAttributes(context);
 return <>
  <div role="separator" />
  <button role="menuitem" {...attrs} data-agent-action="version-history"
   disabled={!!context.unavailableReason} title={context.unavailableReason}
   onClick={() => onHistory(context.resourceKey)}><Icon name="clock" />Version history...</button>
  <button role="menuitem" {...attrs} data-agent-action="compare-previous-version"
   disabled={!context.previousRevisionId || !onComparePrevious} title={context.previousUnavailableReason}
   onClick={() => onComparePrevious?.(context.resourceKey, context.historyRevisionId)}><Icon name="compare" />Compare with previous version</button>
  <button role="menuitem" {...attrs} data-agent-action="open-previous-version"
   disabled={!context.previousRevisionId || !onOpenPrevious} title={context.previousUnavailableReason}
   onClick={() => onOpenPrevious?.(context.resourceKey, context.historyRevisionId)}><Icon name="panel" />Open previous version in other pane</button>
 </>;
}
