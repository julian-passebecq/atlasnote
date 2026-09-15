/** Browsers flatten SVG <tspan> line breaks in Selection.toString(). Recover the
 * selected source characters from the Range instead, without expanding a partial
 * selection to the whole code block or copying anything outside this reader. */
export function selectedSvgText(root:HTMLElement,selection:Selection|null):string|undefined{
 if(!selection||selection.isCollapsed||selection.rangeCount!==1)return;
 const range=selection.getRangeAt(0);
 const element=(node:Node)=>node.nodeType===Node.ELEMENT_NODE?node as Element:node.parentElement;
 const start=element(range.startContainer),end=element(range.endContainer);
 if(!start||!end||!root.contains(start)||!root.contains(end)||!start.closest('.sheet-svg text')||!end.closest('.sheet-svg text'))return;
 const fragment=range.cloneContents(),texts=Array.from(fragment.querySelectorAll('text'));
 return (texts.length?texts.map(t=>t.textContent??'').join('\n'):fragment.textContent??'').replaceAll('\u200b','');
}
