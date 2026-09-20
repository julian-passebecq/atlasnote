/** Deterministic SYNTHETIC fixture construction for disposable QA profiles only.
 * No imports so the same function can run in Node and inside the real browser.
 * It does not run a write, archive, or capacity gate on its own.
 */
export async function buildCapacityFixture(input,boundary){
 const allowed=['2000-revisions-per-resource','25000-total-revisions','500-review-rows','64-MiB-structured-history'];
 if(!allowed.includes(boundary))throw Error('Unknown capacity boundary');
 const workspace=structuredClone(input),h=workspace.history;
 if(!h?.meta.initialized||(h.archives??[]).length)throw Error('Use a fresh, initialized disposable demo workspace');
 const prefix='qa.v23.capacity.'+allowed.indexOf(boundary)+'.';
 if(h.heads.some(r=>r.resourceKey.includes(prefix)))throw Error('Capacity fixture already installed');
 const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
 const hash=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(stable(v))))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const bytes=()=>new TextEncoder().encode(JSON.stringify(h)).length;
 let totalToAdd=boundary==='25000-total-revisions'?25000-h.revisions.length:boundary==='2000-revisions-per-resource'?2000:1;
 if(totalToAdd<1)throw Error('Baseline is already full');
 let group=0,resourceKey,firstRevisionId;
 while(totalToAdd){
  const count=Math.min(2000,totalToAdd),id=prefix+'page.'+group,key='notebook-page:'+id;
  const page={id,title:'Synthetic capacity page '+group,summary:'Disposable qualification fixture',blocks:[],related:[],terms:[],sources:[],tags:[]};
  workspace.overlays.pages[id]={page};
  const snapshot={page},contentHash=await hash(snapshot);
  let parent=null;
  for(let number=1;number<=count;number++){
   const revisionId=prefix+'revision.'+group+'.'+number;
   h.revisions.push({kind:'revision',schemaVersion:1,revisionId,resourceKey:key,resourceId:id,resourceType:'notebook-page',number,parentRevisionId:parent,createdAt:1789689600000+number,source:'system',summary:'Synthetic forced capacity revision',status:'committed',contentHash,snapshot:structuredClone(snapshot)});
   parent=revisionId;if(!firstRevisionId)firstRevisionId=revisionId;
  }
  h.heads.push({kind:'head',schemaVersion:1,resourceKey:key,revisionId:parent,number:count,contentHash});
  resourceKey??=key;totalToAdd-=count;group++;
 }
 const head=h.heads.find(x=>x.resourceKey===resourceKey),r=h.revisions.find(x=>x.revisionId===head.revisionId);
 const pendingId=prefix+'retained.pending';
 const pendingSnapshot=structuredClone(r.snapshot);pendingSnapshot.page.title+=' / pending sentinel';
 h.reviews.push({kind:'review',schemaVersion:1,id:pendingId,status:'staged',createdAt:1789689600000,plan:{schemaVersion:1,kind:'atlas-agent-changeset',id:pendingId,source:'Synthetic retained-pending sentinel',createdAt:1789689600000,operations:[{id:prefix+'pending.op',kind:'resource.update',resourceKey,baseRevisionId:head.revisionId,payload:{resourceType:'notebook-page',snapshot:pendingSnapshot}}]}});
 const closed=[];
 const fillCount=boundary==='500-review-rows'?500-h.reviews.length:boundary==='64-MiB-structured-history'?128:0;
 for(let i=0;i<fillCount;i++){
  const id=prefix+'closed.'+i;
  const review={kind:'review',schemaVersion:1,id,status:'rejected',createdAt:1789689600000,decidedAt:1789689600001,plan:{schemaVersion:1,kind:'atlas-agent-changeset',id,source:'Synthetic capacity audit',createdAt:1789689600000,operations:[]},reason:''};
  h.reviews.push(review);closed.push(review);
 }
 h.meta.epoch++;
 if(boundary==='64-MiB-structured-history'){
  // Fill *valid* closed audit records, not an invalid giant object. Each row is
  // well below the archive entry limit. Seeded ASCII avoids zip-bomb ratios.
  let remaining=64*1024*1024-bytes();
  if(remaining<0)throw Error('Baseline exceeds byte fixture boundary');
  const alphabet=new TextEncoder().encode('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');
  let seed=0x6a09e667;
  for(let i=0;i<closed.length;i++){
   const count=Math.ceil(remaining/(closed.length-i)),data=new Uint8Array(count);
   for(let j=0;j<count;j++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[j]=alphabet[(seed>>>0)&63];}
   closed[i].reason=new TextDecoder().decode(data);remaining-=count;
  }
 }
 const perResource=h.revisions.filter(x=>x.resourceKey===resourceKey).length;
 return {workspace,boundary,resourceKey,firstRevisionId,pendingId,counts:{perResource,total:h.revisions.length,reviews:h.reviews.length,bytes:bytes()}};
}
