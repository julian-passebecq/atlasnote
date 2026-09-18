import {store} from '../storage/database.js';
import {compose} from '../core/workspace.js';
import {resourceAdapters} from './adapters.js';
/** Manual restore is a user action, not exposed on the agent facade. */
export async function restoreAsNewRevision(built:any,revisionId:string,expectedHead:string){
 const resource=store.state.history?.revisions.find(r=>r.revisionId===revisionId);if(!resource)throw Error('Revision is unavailable');
 await store.reviewedMutation(ws=>{const current=ws.history?.heads.find(h=>h.resourceKey===resource.resourceKey);if(current?.revisionId!==expectedHead)throw Error('Current version changed. Review the restore again.');resourceAdapters[resource.resourceType].project(ws.overlays,compose(built,ws),resource.snapshot);},{source:'restore',summary:'Restore version '+resource.number+' as a new version',restoredFromRevisionId:resource.revisionId,forceResourceKey:resource.resourceKey});
}
