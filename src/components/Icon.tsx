import React from '../vendor/react.mjs';
const paths:Record<string,string>={
 save:'M5 3h14v18l-7-4-7 4V3zM8 9h8M12 5v8',
 'save-all':'M8 6h13v16l-6-4-7 4V6zM4 18H2V2h14v2M11 11h7m-3.5-3.5v7',
 restore:'M4 11a8 8 0 1 1 2 7M4 4v7h7M12 7v6l4 2',
 'restore-all':'M6 9a7 7 0 1 1 2 10M6 3v6h6M2 13v8h5M14 8v5l3 2',
 'saved-list':'M4 3h5v7L6.5 8 4 10V3zM12 5h9M12 9h9M4 15h17M4 20h17',
 openbook:'M12 6C9 3 5 3 2 4v15c4-1 7 0 10 2m0-15c3-3 7-3 10-2v15c-4-1-7 0-10 2V6z',
 spread:'M2 4h8v16H2V4zm12 0h8v16h-8V4zM5 8h2M17 8h2',
 compare:'M2 3h8v18H2V3zm12 0h8v18h-8V3zM3 7h6M15 7h6',
 chrome:'M3 3h18v18H3V3zM3 9h18m-13 7 4-4 4 4',
 top:'M3 4h18v16H3V4zm0 4h18m-13 8 4-4 4 4',
 briefcase:'M3 7h18v14H3V7zm5 0V3h8v4M3 12h18m-11 0v3h4v-3',
 person:'M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 8 0 0 1 16 0v3',
 python:'M12 3H6v8h12v10h-6M12 3h6v10H6v8h6M8 6h.01M16 18h.01',
 microsoft:'M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7',
 databricks:'m2 7 10-5 10 5-10 5L2 7zm0 5 10 5 10-5M2 17l10 5 10-5',

 rotate:'M20 10a8 8 0 1 0-2 8M20 3v7h-7',
 theme:'M12 3a9 9 0 1 0 9 9c0-2-1-3-3-3h-2c-2 0-2-2-2-3s-1-3-2-3zM7 9h.01M7 14h.01M11 17h.01',
 book:'M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zm0 12h15M8 4v12M11 8h5M11 11h5',
 home:'m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 folder:'M3 6h7l2 3h9v11H3V6z',page:'M5 3h9l5 5v13H5V3zm9 0v6h5M8 13h8M8 17h6',pdf:'M5 3h9l5 5v13H5V3zm9 0v6h5M8 18v-6h2a2 2 0 0 1 0 4H8m6 2v-6h2m-2 3h2',
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
