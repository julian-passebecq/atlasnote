import {loadSchemas} from '../core/packs.mjs';
let pending:Promise<any>|undefined;
export function schemas(){return pending??(pending=loadSchemas(async(n:string)=>{const r=await fetch(new URL('app/content/schemas/'+n,document.baseURI));if(!r.ok)throw Error('Schema unavailable: '+n);return r.text();}));}
