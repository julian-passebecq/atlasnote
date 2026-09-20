import {requireHistoricalRevision,archivedAsset} from '../durability/registry.js';
import {requiredRevisionAssets} from '../durability/archive.mjs';
import {store} from '../storage/database.js';
import {compose} from '../core/workspace.js';
import {resourceAdapters} from './adapters.js';
/** Manual restore is a user action, not exposed on the agent facade. */
export async function restoreAsNewRevision(built:any,revisionId:string,expectedHead:string){
 const resource=structuredClone(requireHistoricalRevision(store.state.history,revisionId));
 await store.reviewedMutation(ws=>{const current=ws.history?.heads.find(h=>h.resourceKey===resource.resourceKey);if(current?.revisionId!==expectedHead)throw Error('Current version changed. Review the restore again.');for(const key of requiredRevisionAssets([resource]).keys())if(!ws.assets.some(a=>a.key===key)){const asset=archivedAsset(ws.history,key);if(asset)ws.assets.push(asset);else if(ws.history?.archives?.some(a=>a.ranges.some(r=>r.revisions.some(r=>r.revisionId===revisionId))))throw Error('Archived byte dependency unavailable: '+key);}
 resourceAdapters[resource.resourceType].project(ws.overlays,compose(built,ws),resource.snapshot);},{source:'restore',summary:'Restore version '+resource.number+' as a new version',restoredFromRevisionId:resource.revisionId,forceResourceKey:resource.resourceKey});
}
