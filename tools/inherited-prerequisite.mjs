import {releaseStatus,V23_GATES} from './v23-release-contract.mjs';
export function acceptsInheritedPrerequisite(report,source,now=Date.now()){
 if(!report||report.scope!=='full-v23'||report.provider!=='cloudflare'||report.status!=='READY FOR COORDINATOR QA'||!report.runId)return false;
 const start=Date.parse(report.startedAt),end=Date.parse(report.finishedAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>end||end>now||now-end>3600000)return false;
 if(report.sourceDirty||source.sourceDirty||report.sourceCommit!==source.sourceCommit||report.sourceHash!==source.sourceHash||report.sourceTree!==source.sourceTree)return false;
 if(!Array.isArray(report.results)||report.results.some(row=>row.sourceDrift||row.sourceHash!==source.sourceHash))return false;
 return releaseStatus(report.results,V23_GATES)==='READY FOR COORDINATOR QA';
}
