/** Same-origin internal interface for a future explicitly authorized thin bridge.
 * This module is not a server or a global write endpoint. Accept/reject are human
 * decisions: an external model receives context and returns a staged proposal.
 * No IndexedDB handles, generic setters, backup restore or deployment functions
 * are exported. UI and this entry share the same configured service instance. */
export {getAgentInterface,getAgentCapabilities,validateChangeSet} from './service.js';
export type {AgentInterface} from './service.js';
export type {AgentChangeSet,AgentOperation,AgentScope} from './model.js';
