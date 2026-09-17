import type {Catalogue,Workspace} from '../core/model.js';
import type {ResourceTarget} from '../core/reading-types.js';
import {resolveTarget} from '../references/targets.js';
import {targetTaxonomy,taxonomyLabel} from './taxonomy.js';
/** Derived presentation only: the canonical typed target remains the stored reference. */
export function contextLabel(c:Catalogue,ws:Workspace,target:ResourceTarget):string{
 const resolved=resolveTarget(c,ws,target),taxonomy=targetTaxonomy(c,ws,target);
 return [taxonomy?taxonomyLabel(taxonomy,c,ws.overlays).replaceAll(' / ',' › '):'',resolved.title,resolved.detail].filter(Boolean).join(' — ');
}
