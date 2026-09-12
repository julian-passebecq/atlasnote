/** DOM-measured pagination. Source DOM is immutable; fragments clone semantic nodes,
 * not HTML substrings. Oversized unsplittable units get an explicit readable fallback.
 * Only this module owns the generated sheet DOM. React owns the measuring tree. */
let cloneSerial=0;
function clone(node){const copy=node.cloneNode(true),suffix='-fragment-'+(++cloneSerial);const ids=new Map();copy.querySelectorAll('[id]').forEach(el=>{ids.set(el.id,el.id+suffix);el.id+=suffix;});copy.querySelectorAll('*').forEach(el=>{for(const a of [...el.attributes]){let v=a.value;for(const [old,id]of ids){v=v.replaceAll('url(#'+old+')','url(#'+id+')');if(v==='#'+old)v='#'+id;}if(v!==a.value)el.setAttribute(a.name,v);}});return copy;}
function textPosition(root,offset){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node,last=null,n=0;while(node=walker.nextNode()){last=node;const length=node.textContent.length;if(n+length>=offset)return[node,offset-n];n+=length;}return last?[last,last.textContent.length]:[root,0];}
function sliceText(root,from,to){const range=document.createRange(),a=textPosition(root,from),b=textPosition(root,to);range.setStart(...a);range.setEnd(...b);let fragment=range.cloneContents();let parent=range.commonAncestorContainer.nodeType===Node.TEXT_NODE?range.commonAncestorContainer.parentNode:range.commonAncestorContainer;while(parent&&parent!==root){const wrapper=parent.cloneNode(false);wrapper.append(fragment);fragment=document.createDocumentFragment();fragment.append(wrapper);parent=parent.parentNode;}return fragment;}
function wordCuts(text){const cuts=[];for(const m of text.matchAll(/\s+/g))cuts.push(m.index+m[0].length);if(!cuts.length){let n=0;for(const c of text){n+=c.length;cuts.push(n);}}if(cuts.at(-1)!==text.length)cuts.push(text.length);return cuts;}
function fallback(unit){const d=document.createElement('div');d.className='content-unit book-fallback';Object.assign(d.dataset,unit.dataset);d.dataset.fallback='true';const title=document.createElement('strong');title.textContent=unit.dataset.kind==='table'?'A table row needs more room':'This block needs a larger reading canvas';const p=document.createElement('p');p.textContent='No content has been discarded. Open the original block in Continuous to read it at full size.';const b=document.createElement('button');b.textContent='Open full block in Continuous';b.dataset.action='continuous-block';b.dataset.block=unit.dataset.blockId;d.append(title,p,b);return d;}
export function paginateDOM(source,probe,{height,width,title=''}){
 if(!(height>=120&&width>=180))throw Error('The Book canvas is too small. Open Continuous or enlarge the window.');
 probe.style.width=width+'px';const measure=el=>{probe.replaceChildren(el);return el.getBoundingClientRect().height;};
 const sourceUnits=[...source.children],sheets=[],fallbacks=[];let sheet=[],used=0;
 function flush(){if(sheet.length){sheets.push(sheet);sheet=[];used=0;}}
 function place(el){const h=measure(el);if(h>height+1)throw Error('Unbounded Book fragment: '+el.dataset.blockId);if(used+h>height+0.5)flush();sheet.push(el);used+=h;}
 function fits(el,remaining){return measure(el)<=remaining+0.5;}
 function splitUnit(unit){const kind=unit.dataset.kind;
 if(kind==='paragraph'){
  const text=unit.textContent??'',cuts=wordCuts(text);let start=0;const base=Number(unit.dataset.offset||0);
  while(start<text.length){let candidates=cuts.filter(x=>x>start),lo=0,hi=candidates.length-1,best=-1,remaining=height-used;
   const make=end=>{const el=unit.cloneNode(false);el.append(sliceText(unit,start,end));el.dataset.offset=String(base+start);el.dataset.end=String(base+end);el.dataset.fragment=start?'continued':'start';return el;};
   while(lo<=hi){const mid=(lo+hi)>>1;if(fits(make(candidates[mid]),remaining)){best=mid;lo=mid+1;}else hi=mid-1;}
   if(best<0){if(sheet.length){flush();continue;}const f=fallback(unit);fallbacks.push(unit.dataset.blockId);place(f);return;}
   const end=candidates[best];place(make(end));start=end;if(start<text.length)flush();
  }return;
 }
 const selector=kind==='code'?'.code-line':kind==='table'?'tbody > tr':kind==='list'?'li':null;
 if(selector){const parts=[...unit.querySelectorAll(selector)];let start=0;
  function make(end){const el=clone(unit),all=[...el.querySelectorAll(selector)];all.forEach((n,i)=>{if(i<start||i>=end)n.remove();});el.dataset.offset=String(Number(unit.dataset.offset||0)+start);el.dataset.end=String(Number(unit.dataset.offset||0)+end);el.dataset.fragment=start?'continued':'start';if(kind==='list'){const ol=el.querySelector('ol');if(ol)ol.start=(Number(unit.querySelector('ol')?.getAttribute('start'))||1)+start;}
   if(start){const label=document.createElement('div');label.className='continuation-label';label.textContent=(kind==='table'?'Table':kind==='code'?'Code':'List')+' continued';el.prepend(label);}return el;}
  while(start<parts.length){let lo=start+1,hi=parts.length,best=start,remaining=height-used;while(lo<=hi){const mid=(lo+hi)>>1;if(fits(make(mid),remaining)){best=mid;lo=mid+1;}else hi=mid-1;}if(best===start){if(sheet.length){flush();continue;}const f=fallback(unit);fallbacks.push(unit.dataset.blockId);place(f);return;}place(make(best));start=best;if(start<parts.length)flush();}return;
 }
 const f=fallback(unit);fallbacks.push(unit.dataset.blockId);place(f);
 }
 for(let i=0;i<sourceUnits.length;i++){
  const unit=clone(sourceUnits[i]);if(unit.dataset.kind==='page_break'){flush();continue;}
  if(unit.dataset.breakBefore==='true')flush();const h=measure(unit);
  if((unit.dataset.kind==='heading'||unit.dataset.keepNext==='true')&&sheet.length){const next=sourceUnits.slice(i+1).find(n=>n.dataset.kind!=='page_break');if(next){const nextH=measure(clone(next));const minimum=nextH+h<=height?nextH:Math.min(nextH,90);if(used+h+minimum>height)flush();}}
  const preceding=sheet.at(-1);const headingWouldBeStranded=preceding&&(preceding.dataset.kind==='heading'||preceding.dataset.keepNext==='true')&&used+h>height;
  if(headingWouldBeStranded){if(['paragraph','code','table','list'].includes(unit.dataset.kind))splitUnit(unit);else {const f=fallback(unit);fallbacks.push(unit.dataset.blockId);place(f);}}else if(h<=height){place(unit);}else splitUnit(unit);
 }
 flush();probe.replaceChildren();const fragment=document.createDocumentFragment();
 sheets.forEach((units,i)=>{const el=document.createElement('section');el.className='book-sheet';el.dataset.sheet=String(i+1);el.setAttribute('aria-label',`${title} - sheet ${i+1}`);const header=document.createElement('div');header.className='sheet-header';header.textContent=title;const body=document.createElement('div');body.className='sheet-body';body.style.height=height+'px';body.append(...units);const footer=document.createElement('div');footer.className='sheet-footer';footer.textContent=String(i+1);el.append(header,body,footer);fragment.append(el);});
 return {fragment,count:sheets.length,fallbacks,sourceUnitCount:sourceUnits.length};
}
export function visibleAnchor(scroller){const top=scroller.getBoundingClientRect().top;const all=[...scroller.querySelectorAll('.sheet-body [data-block-id], .continuous-content > [data-block-id]')];const el=all.find(n=>n.getBoundingClientRect().bottom>top+36&&n.getBoundingClientRect().top>=top-80)??all.find(n=>n.getBoundingClientRect().bottom>top+36);return el?{blockId:el.dataset.blockId,offset:Number(el.dataset.offset||0)}:undefined;}
export function findAnchor(scroller,anchor){if(!anchor?.blockId)return null;const candidates=[...scroller.querySelectorAll('[data-block-id]')].filter(n=>n.dataset.blockId===anchor.blockId&&!n.closest('.book-measure'));return candidates.find(n=>Number(n.dataset.offset||0)<=Number(anchor.offset||0)&&Number(n.dataset.end||Infinity)>Number(anchor.offset||0))??candidates[0]??null;}
export function scrollToAnchor(scroller,anchor){const el=findAnchor(scroller,anchor);if(el){const target=el.getBoundingClientRect().top-scroller.getBoundingClientRect().top+scroller.scrollTop-20;scroller.scrollTop=Math.max(0,target);return true;}return false;}
