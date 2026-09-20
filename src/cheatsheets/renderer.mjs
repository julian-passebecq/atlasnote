import {validateCheatsheet} from './validation.mjs';
import {ASSET_REGISTRY} from './assets.mjs';
import {plainText,layoutRich,fitRich} from './text-layout.mjs';
export const CALM_TOKENS=Object.freeze({paper:'#fbfcfd',ink:'#293746',primary:'#183f68',secondary:'#47745e',line:'#e2eaf0',code:'#eef2f6',warning:'#983c4c',warningFill:'#fbf0f1'});
export const escapeXML=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const n=v=>String(Math.round(v*1000)/1000);
/** Intersection with actual node bounds, not a hard-coded circle radius. */
export function edgeEndpoint(from,to,shape='roundedRect'){
 const cx=from.x+from.width/2,cy=from.y+from.height/2,dx=to.x+to.width/2-cx,dy=to.y+to.height/2-cy;
 if(!dx&&!dy)return {x:cx,y:cy};const rx=from.width/2,ry=from.height/2;
 const t=shape==='circle'?1/Math.sqrt(dx*dx/(rx*rx)+dy*dy/(ry*ry)):shape==='diamond'?1/(Math.abs(dx)/rx+Math.abs(dy)/ry):1/Math.max(Math.abs(dx)/rx,Math.abs(dy)/ry);
 return {x:cx+dx*t,y:cy+dy*t};
}
/** @param {import('./model.js').CheatsheetDocument} doc
 * @param {number} pageNumber
 * @param {{scope?:string,activeBlock?:string}} [options] */
export function renderCheatsheetPage(doc,pageNumber,options={}){
 const {scope='sheet',activeBlock}=options;
 validateCheatsheet(doc);if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>doc.pages.length)throw Error('Physical cheatsheet page is unavailable.');
 if(!/^[A-Za-z][A-Za-z0-9._-]{0,180}$/.test(scope))throw Error('Unsafe SVG instance scope');
 const page=doc.pages[pageNumber-1],prefix='cs-'+scope.length+'-'+scope+'-'+doc.id.length+'-'+doc.id+'-p'+pageNumber,t={...CALM_TOKENS,...doc.theme?.tokens},diagnostics=[];
 const safe=escapeXML,marker=prefix+'-marker-arrow',clipId=id=>prefix+'-clip-'+id;
 const rect=(f,fill,stroke=t.line,r=8)=>`<rect x="${n(f.x)}" y="${n(f.y)}" width="${n(f.width)}" height="${n(f.height)}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
 function text(value,f,style={},attrs=''){
  const role=style.role??'body',mono=style.mono??false;
  const defaults={title:{fontSize:38,lineHeight:1.18,minFontSize:28,overflow:'shrink'},section:{fontSize:27,lineHeight:1.2,minFontSize:22,overflow:'shrink'},caption:{fontSize:16,lineHeight:1.25},example:{fontSize:19,lineHeight:1.25},body:{fontSize:22,lineHeight:1.38},key:{fontSize:22,lineHeight:1.38},warning:{fontSize:19,lineHeight:1.32}};
  const settings={...defaults[role],...style};const result=fitRich(value,f.width,f.height,settings,mono);
  if(result.overflow&&settings.overflow==='error')throw Error('Cheatsheet overflow in '+(style.blockId??role));
  if(result.overflow)diagnostics.push({blockId:style.blockId??'',reason:'Text exceeds fixed frame',fontSize:result.fontSize});
  const fill=role==='warning'?t.warning:['title','section','key'].includes(role)?t.primary:role==='example'?'#171d24':role==='caption'?'#566674':t.ink;
  let out=`<text xml:space="preserve" font-family="${mono?'Liberation Mono, Courier New, monospace':'Arial, Helvetica, sans-serif'}" font-size="${n(result.fontSize)}" fill="${fill}"${['title','section','key'].includes(role)?' font-weight="700"':''}${role==='example'?' font-style="italic"':''}${result.overflow?' data-overflow="true"':''} ${attrs}>`;
  for(const [i,line] of result.lines.entries()){
   const x=f.x+(settings.align==='center'?(f.width-line.width)/2:settings.align==='right'?f.width-line.width:0),y=f.y+result.fontSize*.91+i*result.fontSize*result.lineHeight;
   out+=`<tspan x="${n(x)}" y="${n(y)}">`;
   for(const run of line.fragments){const marks=run.marks;out+=`<tspan${marks.includes('bold')||marks.includes('key')?' font-weight="700"':''}${marks.includes('italic')?' font-style="italic"':''}${marks.includes('underline')?' text-decoration="underline"':''}${marks.includes('code')?' font-family="Liberation Mono, Courier New, monospace"':''}${marks.includes('key')||marks.includes('highlight')?' fill="'+t.primary+'"':''}>${safe(run.text)}</tspan>`;}
   out+='</tspan>';
  }return out+'</text>';
 }
 function icon(key,f){const asset=ASSET_REGISTRY[key];return `<svg x="${n(f.x)}" y="${n(f.y)}" width="${n(f.width)}" height="${n(f.height)}" viewBox="0 0 24 24" aria-hidden="true"><path d="${asset.path}" fill="none" stroke="${t.primary}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;}
 function nodeShape(shape,f){if(shape==='circle')return `<ellipse cx="${n(f.x+f.width/2)}" cy="${n(f.y+f.height/2)}" rx="${n(f.width/2)}" ry="${n(f.height/2)}" fill="${t.paper}" stroke="${t.primary}"/>`;if(shape==='diamond')return `<polygon points="${n(f.x+f.width/2)},${n(f.y)} ${n(f.x+f.width)},${n(f.y+f.height/2)} ${n(f.x+f.width/2)},${n(f.y+f.height)} ${n(f.x)},${n(f.y+f.height/2)}" fill="${t.paper}" stroke="${t.primary}"/>`;return rect(f,t.paper,t.primary,shape==='rect'?0:8);}
 function arrow(a,b,dashed=false,label){let out=`<line data-diagram-edge="true" x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" stroke="${t.secondary}" stroke-width="2"${dashed?' stroke-dasharray="6 4"':''} marker-end="url(#${marker})"/>`;if(label)out+=text(label,{x:(a.x+b.x)/2-52,y:(a.y+b.y)/2-24,width:104,height:24},{role:'caption',fontSize:15,align:'center',overflow:'shrink',minFontSize:12});return out;}
 function block(b){const f=page.frames[b.id],s={...b.style,blockId:b.id};let body='';
  const inset=(pad=14,top=pad)=>({x:f.x+pad,y:f.y+top,width:f.width-2*pad,height:f.height-top-pad});
  switch(b.type){
   case 'text':body=text(b.text,f,{role:b.role??'body',...s});break;
   case 'list':{
    let size=s.fontSize??22,items;const gap=b.gap??9,min=s.minFontSize??16;
    do{items=b.items.map(v=>layoutRich(v,f.width-26,size,s.lineHeight??1.38));if(items.reduce((a,x)=>a+x.height,0)+gap*(items.length-1)<=f.height||s.overflow!=='shrink'||size<=min)break;size-=.5;}while(true);
    let y=f.y;for(const [i,item] of b.items.entries()){const height=items[i].height;body+=text(b.ordered?String(i+1)+'.':'\u2022',{x:f.x,y,width:24,height},{fontSize:size,lineHeight:s.lineHeight??1.38,role:'key'});body+=text(item,{x:f.x+26,y,width:f.width-26,height},{...s,fontSize:size});y+=height+gap;}
    if(y-gap>f.y+f.height+.1&&s.overflow==='error')throw Error('Cheatsheet list overflow in '+b.id);if(y-gap>f.y+f.height+.1)diagnostics.push({blockId:b.id,reason:'List exceeds fixed frame'});break;
   }
   case 'code':{
    body=rect(f,t.code,'#d4dfe8');const title=b.title?34:0;if(b.title)body+=text(b.title,{x:f.x+16,y:f.y+12,width:f.width-32,height:30},{role:'example',...s});
    body+=text(b.code,{x:f.x+16,y:f.y+14+title,width:f.width-32,height:f.height-28-title},{fontSize:17,lineHeight:1.42,minFontSize:12,overflow:'shrink',...s,mono:true},'data-code-language="'+safe(b.language)+'"');break;
   }
   case 'box':{
    const warning=b.variant==='warning',top=b.title?42:14;body=rect(f,warning?t.warningFill:'#f0f5f3',warning?'#d5aeb5':'#cfddd5');if(b.title)body+=text(b.title,{x:f.x+16,y:f.y+13,width:f.width-32,height:30},{role:warning?'warning':'example',...s});if(b.text!==undefined)body+=text(b.text,{x:f.x+16,y:f.y+top,width:f.width-32,height:f.height-top-14},{fontSize:19,lineHeight:1.33,minFontSize:16,overflow:'shrink',...s});if(b.children)body+=b.children.map(block).join('');break;
   }
   case 'table':{
    const widths=(b.widths??b.columns.map(()=>1/b.columns.length)).map(v=>v*f.width),rows=[b.columns,...b.rows],pad=8;let size=s.fontSize??18,heights;
    do{heights=rows.map(row=>Math.max(...row.map((v,i)=>layoutRich(v,widths[i]-pad*2,size,s.lineHeight??1.25).height))+pad*2);if(heights.reduce((a,x)=>a+x,0)<=f.height||s.overflow==='clip'||s.overflow==='error'||size<=(s.minFontSize??14))break;size-=.5;}while(true);
    // Let the author's allocated table height distribute breathing room evenly.
    const extra=Math.max(0,(f.height-heights.reduce((a,x)=>a+x,0))/heights.length);let y=f.y;
    for(const [ri,row] of rows.entries()){const height=heights[ri]+extra;let x=f.x;for(const [ci,value] of row.entries()){body+=rect({x,y,width:widths[ci],height},ri===0?'#e6efe9':ri%2===0?'#f5f8f6':t.paper,'#bdcec4',0);body+=text(value,{x:x+pad,y:y+pad+extra/2,width:widths[ci]-2*pad,height:height-2*pad},{...s,fontSize:size,lineHeight:s.lineHeight??1.25,role:ri===0?'key':'body'});x+=widths[ci];}y+=height;}
    if(y>f.y+f.height+.1&&s.overflow==='error')throw Error('Cheatsheet table overflow in '+b.id);if(y>f.y+f.height+.1)diagnostics.push({blockId:b.id,reason:'Table exceeds fixed frame'});break;
   }
   case 'divider':body=`<line x1="${n(f.x)}" y1="${n(f.y+f.height/2)}" x2="${n(f.x+f.width)}" y2="${n(f.y+f.height/2)}" stroke="${t.line}"/>`;break;
   case 'diagram':{
    const contentH=f.height-(b.caption?28:0);const nodeText=(label,r)=>text(label,{x:r.x+7,y:r.y+5,width:r.width-14,height:r.height-10},{...s,fontSize:17,lineHeight:1.16,minFontSize:10,overflow:'shrink',align:'center'});
    if(b.family==='graph'){
     const frames=Object.fromEntries(Object.entries(b.nodeFrames).map(([id,r])=>[id,{...r,x:r.x+f.x,y:r.y+f.y}]));
     for(const edge of b.edges){const a=b.nodes.find(x=>x.id===edge.from),z=b.nodes.find(x=>x.id===edge.to);body+=arrow(edgeEndpoint(frames[a.id],frames[z.id],a.shape),edgeEndpoint(frames[z.id],frames[a.id],z.shape),edge.dashed,edge.label);}
     for(const node of b.nodes){const r=frames[node.id];body+=`<g data-node-id="${safe(node.id)}">`+nodeShape(node.shape??'roundedRect',r)+(node.assetKey?icon(node.assetKey,{x:r.x+8,y:r.y+8,width:20,height:20}):'')+nodeText(node.label,node.assetKey?{...r,x:r.x+25,width:r.width-25}:r)+'</g>';}
    }else{
     const vertical=b.direction==='vertical',count=b.items.length,gap=b.link==='none'?6:28,w=vertical?f.width-40:(f.width-gap*(count-1))/count,h=vertical?(contentH-gap*(count-1))/count:Math.min(72,contentH-12),r=[];
     for(let i=0;i<count;i++)r.push({x:f.x+(vertical?20:i*(w+gap)),y:f.y+(vertical?i*(h+gap):Math.max(0,(contentH-h)/2)),width:w,height:h});
     for(let i=0;i<count-1;i++)if(b.link!=='none')body+=arrow(edgeEndpoint(r[i],r[i+1]),edgeEndpoint(r[i+1],r[i]));
     for(const [i,label] of b.items.entries()){body+=nodeShape('roundedRect',r[i]);if(b.preset==='linked_list'){const split=r[i].x+r[i].width*.76;body+=`<line data-pointer-compartment="true" x1="${n(split)}" y1="${n(r[i].y)}" x2="${n(split)}" y2="${n(r[i].y+r[i].height)}" stroke="${t.primary}"/>`;body+=nodeText(label,{...r[i],width:r[i].width*.76});}else body+=nodeText(label,r[i]);}
    }
    if(b.caption)body+=text(b.caption,{x:f.x,y:f.y+f.height-23,width:f.width,height:23},{role:'caption',align:'center',...s,fontSize:16});break;
   }
   case 'drawing':for(const shape of b.shapes){if(shape.type==='line')body+=`<line x1="${n(f.x+shape.x1)}" y1="${n(f.y+shape.y1)}" x2="${n(f.x+shape.x2)}" y2="${n(f.y+shape.y2)}" stroke="${t.primary}"/>`;else if(shape.type==='ellipse')body+=`<ellipse cx="${n(f.x+shape.x+shape.width/2)}" cy="${n(f.y+shape.y+shape.height/2)}" rx="${n(shape.width/2)}" ry="${n(shape.height/2)}" fill="none" stroke="${t.primary}"/>`;else body+=rect({x:f.x+shape.x,y:f.y+shape.y,width:shape.width,height:shape.height},'none',t.primary,0);}break;
   case 'icon':body=icon(b.assetKey,f);break;
   case 'image':body=`<image href="${ASSET_REGISTRY[b.assetKey].path}" x="${n(f.x)}" y="${n(f.y)}" width="${n(f.width)}" height="${n(f.height)}" preserveAspectRatio="xMidYMid meet"><title>${safe(b.alt)}</title></image>`;break;
  }
  const focus=activeBlock===b.id?rect({x:f.x-3,y:f.y-3,width:f.width+6,height:f.height+6},'none',t.primary,6):'';
  return `<g id="${prefix+'-block-'+safe(b.id)}" data-block-id="${safe(b.id)}" data-block-kind="${b.type}" data-frame="${[f.x,f.y,f.width,f.height].map(n).join(',')}"${b.type==='code'?' aria-label="'+safe(b.title??b.language+' example')+'"':''}>${focus}<g clip-path="url(#${clipId(b.id)})">${body}</g></g>`;
 }
 let clips='';function define(bs){for(const b of bs){clips+=`<clipPath id="${clipId(b.id)}">${rect(page.frames[b.id],'white','none',0)}</clipPath>`;if(b.children)define(b.children);}}define(page.blocks);
 const paperLines=Array.from({length:38},(_,i)=>`M0 ${184+i*35}H1200`).join(' ');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="${prefix}-meta-title ${prefix}-meta-desc" data-cheatsheet-page="${pageNumber}"><title id="${prefix}-meta-title">${safe(page.title)}</title><desc id="${prefix}-meta-desc">${safe(doc.title)}. Physical page ${pageNumber} of ${doc.pages.length}. Selectable text; fixed page geometry.</desc><defs><marker id="${marker}" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0L7 3.5L0 7Z" fill="${t.secondary}"/></marker>${clips}</defs><rect width="1200" height="1600" fill="${t.paper}"/><path d="${paperLines}" fill="none" stroke="${t.line}" stroke-width="1"/><path d="M65 0V1600" fill="none" stroke="#cad6df"/>${page.blocks.map(block).join('')}${text(String(pageNumber)+' / '+doc.pages.length,{x:1040,y:1545,width:90,height:28},{role:'caption',align:'right'})}</svg>`;
 return {svg,diagnostics};
}
