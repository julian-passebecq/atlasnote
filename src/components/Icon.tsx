import React from '../vendor/react.mjs';
const paths:Record<string,string>={
 book:'M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zm0 12h15M8 4v12M11 8h5M11 11h5',
 home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 folder:'M3 6h7l2 3h9v11H3V6z',page:'M5 3h9l5 5v13H5V3zm9 0v6h5M8 13h8M8 17h6',pdf:'M5 3h9l5 5v13H5V3zm9 0v6h5M8 14h8M8 17h6',
 chevron:'m9 5 7 7-7 7',down:'m5 9 7 7 7-7',left:'m15 5-7 7 7 7',right:'m9 5 7 7-7 7',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',
 settings:'m9 3-1 3-3 1v3l-2 2 2 2v3l3 1 1 3h6l1-3 3-1v-3l2-2-2-2V7l-3-1-1-3H9zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 bookmark:'M6 3h12v18l-6-4-6 4V3z',flag:'M5 21V3m0 1h7l2 2h6v10h-6l-2-2H5',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
 panel:'M3 4h18v16H3V4zm6 0v16',context:'M3 4h18v16H3V4zm12 0v16',split:'M3 4h18v16H3V4zm9 0v16',focus:'M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5',
 export:'M12 16V3m-4 4 4-4 4 4M4 14v7h16v-7',download:'M12 3v14m-4-4 4 4 4-4M4 17v4h16v-4',upload:'M12 17V3m-4 4 4-4 4 4M4 17v4h16v-4',
 edit:'m4 16 11-11 4 4L8 20H4v-4zm9-9 4 4M14 3l2-2 5 5-2 2',more:'M5 12h.01M12 12h.01M19 12h.01',check:'m4 12 5 5L20 6',cloud:'M7 18a5 5 0 1 1 1-10 6 6 0 0 1 11 2 4 4 0 1 1-1 8H7z',
 database:'M4 6c0-4 16-4 16 0s-16 4-16 0zm0 0v12c0 4 16 4 16 0V6M4 12c0 4 16 4 16 0',language:'M3 5h11M8 3v2m-3 1c0 6 7 10 7 10M13 5c0 6-5 10-10 12m11 4 4-12 4 12m-6-4h4',
 code:'m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18',link:'m9 15 6-6M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
 print:'M6 8V3h12v5M6 17H3V8h18v9h-3M6 14h12v7H6v-7',lock:'M6 10h12v11H6V10zm2 0V6a4 4 0 0 1 8 0v4M12 14v3',swap:'M3 7h17l-4-4m5 14H4l4 4',archive:'M3 3h18v5H3V3zm2 5v13h14V8M9 12h6',help:'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',copy:'M8 8h13v13H8V8zM16 8V3H3v13h5',list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'};
export function Icon({name='book',size=18}:{name?:string;size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.book}/></svg>;}
export function IconButton({name,label,onClick,active=false,disabled=false,className='',...rest}:any){return <button className={'icon-button '+(active?'selected ':'')+className} title={label} aria-label={label} aria-pressed={active||undefined} disabled={disabled} onClick={onClick} {...rest}><Icon name={name}/></button>;}
