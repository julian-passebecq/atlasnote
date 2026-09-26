import React,{useEffect,useState} from '../vendor/react.mjs';
import {getBuildIdentity} from '../durability/provenance.js';
import type {BuildIdentity} from '../durability/model.js';
/** The same generated identity is used by backups, the title, and PDF traces. */
export function BuildIdentityLabel(){
 const [identity,setIdentity]=useState<BuildIdentity|null>(null);
 useEffect(()=>{let alive=true;getBuildIdentity().then(value=>{if(alive)setIdentity(value);}).catch(()=>{});return()=>{alive=false;};},[]);
 return <small className="secondary" data-build-version={identity?.appVersion} title={identity?identity.sourceCommit+' / '+identity.buildKind+(identity.sourceDirty?' / modified source':''):'Build identity unavailable'}>
  AtlasNote {identity?.appVersion??'(build unknown)'} <span aria-hidden="true">/</span> Local-first workspace
 </small>;
}
