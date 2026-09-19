import type {BuildIdentity} from './model.js';
import {validateBuildIdentity} from './descriptor.mjs';
let identity:Promise<BuildIdentity>|undefined;
/** Generated from the actual clean/dirty build tree, never a hardcoded "latest". */
export function getBuildIdentity():Promise<BuildIdentity>{return identity??=(async()=>{const response=await fetch(new URL('/build-identity.json',location.origin),{cache:'no-store'});if(!response.ok)throw Error('Build provenance is unavailable; artifact generation stopped.');const data=await response.json();validateBuildIdentity(data);return Object.freeze(data) as BuildIdentity;})().catch(e=>{identity=undefined;throw e;});}
