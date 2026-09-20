/** Shared keyboard behavior for tree and reading menus. Disabled entries remain
 * discoverable but are skipped by focus navigation, including Home and End. */
export function enabledMenuItems(root: HTMLElement | null): HTMLElement[] {
 return Array.from(root?.querySelectorAll<HTMLElement>(
  '[role="menuitem"]:not(:disabled):not([aria-disabled="true"])'
 ) ?? []);
}
export function focusFirstMenuItem(root: HTMLElement | null) {
 enabledMenuItems(root)[0]?.focus();
}
export function moveMenuFocus(root: HTMLElement | null, key: string): boolean {
 if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return false;
 const items = enabledMenuItems(root);
 if (!items.length) return true;
 const index = items.indexOf(document.activeElement as HTMLElement);
 const next = key === 'Home' ? 0 : key === 'End' ? items.length - 1
  : index < 0 ? (key === 'ArrowDown' ? 0 : items.length - 1)
  : (index + (key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
 items[next]?.focus();
 return true;
}
