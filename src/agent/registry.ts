import type {StateClass,AgentOperation} from './model.js';
import {HISTORY_LIMITS,RESOURCE_TYPES} from '../history/validation.mjs';
export type OperationDefinition={stateClass:StateClass;payloadFields:readonly string[];required:readonly string[];resourceTypes:readonly string[];base:'revision'|'fingerprint'|'new';description:string};
const revision=(fields:string[],description:string,types:readonly string[]=RESOURCE_TYPES):OperationDefinition=>({stateClass:'revision',payloadFields:fields,required:fields,resourceTypes:types,base:'revision',description});
const state=(stateClass:StateClass,fields:string[],required:string[],description:string):OperationDefinition=>({stateClass,payloadFields:fields,required,resourceTypes:[],base:'fingerprint',description});
export const operationRegistry:Record<AgentOperation['kind'],OperationDefinition>={
 'resource.create':{...revision(['resourceType','snapshot'],'Create canonical resource'),base:'new'},
 'resource.update':revision(['resourceType','snapshot'],'Commit canonical source as a new revision'),
 'resource.draft':{...revision(['resourceType','snapshot'],'Retain a canonical AI draft in review metadata; no current edit'),stateClass:'review'},
 'resource.restoreAsNewRevision':revision(['revisionId'],'Restore old source as a new current revision'),
 'taxonomy.assign':revision(['taxonomy'],'Assign explicit orthogonal subject/folder taxonomy',RESOURCE_TYPES.filter(t=>t!=='notebook-tree')),
 'notebook.tree.createNode':revision(['operation'],'Add folder, page placement or typed reference',['notebook-tree']),
 'notebook.tree.renameNode':revision(['operation'],'Rename stable Notebook node',['notebook-tree']),
 'notebook.tree.moveNode':{...revision(['operation','destinationBaseRevisionId'],'Move/reparent stable Notebook node',['notebook-tree']),required:['operation']},
 'notebook.tree.reorderNode':revision(['operation'],'Reorder Notebook siblings',['notebook-tree']),
 'resource.link.add':revision(['label','target'],'Add a typed exact authored link',RESOURCE_TYPES.filter(t=>t!=='notebook-tree')),
 'resource.link.update':revision(['index','label','target'],'Update an authored typed link',RESOURCE_TYPES.filter(t=>t!=='notebook-tree')),
 'resource.link.remove':revision(['index'],'Remove one authored link',RESOURCE_TYPES.filter(t=>t!=='notebook-tree')),
 'reference.add':state('semantic-reference',['source','target','sourceRevision','targetRevision','kind','label','note'],['source','target','sourceRevision','targetRevision','kind'],'Add/update exact reference through the existing semantic service'),
 'reference.remove':state('semantic-reference',['id'],['id'],'Remove one explicit semantic reference'),
 'concept.assignment.propose':state('semantic-reference',['batch'],['batch'],'Stage existing exact-target concept/reference suggestions; existing semantic review remains authoritative'),
 'bookmark.add':state('personal',['target','title'],['target','title'],'Add an explicitly reviewed bookmark'),
 'bookmark.remove':state('personal',['id'],['id'],'Remove one bookmark'),
 'readLater.add':state('personal',['target','title'],['target','title'],'Add an explicitly reviewed reading-list entry'),
 'readLater.remove':state('personal',['id'],['id'],'Remove one reading-list entry'),
 'capture.create':state('personal',['kind','text','url','taxonomy','target'],['kind','text'],'Create a reviewed Quick Capture'),
 'capture.update':state('personal',['id','text','status','taxonomy'],['id','text'],'Update a reviewed Quick Capture'),
 'workspace.navigate':state('workspace',['target','destination'],['target','destination'],'Open canonical target through ReadingDestination'),
 'workspace.compare':state('workspace',['enabled','mode','pane'],['enabled'],'Use the existing independent A/B panes'),
 'pdf.metadata.update':revision(['resourceType','snapshot'],'Update PDF metadata without changing its bytes or rights',['pdf']),
 'pdf.revision.propose':revision(['resourceType','snapshot'],'Use a previously reviewed, user-supplied PDF asset or immutable source',['pdf'])
};
export function getAgentCapabilities(){return {schemaVersion:1,interface:'atlasnote-universal-agent',interfaceVersion:'1.0.0',release:'2.2.0',localOnly:true,moduleEntry:'app/agent/public.js',subjectCodes:['it','cloud','job','kpi','norsk'],limits:HISTORY_LIMITS,resourceTypes:RESOURCE_TYPES,subjects:['IT','Cloud','Job','KPI','Norsk'],contentTypes:['Notebook','PDF','Cheatsheet','Article','QCM'],permissions:{read:'direct',navigation:'direct',authoredWrites:'preview-stage-human-accept',personalWrites:'preview-stage-human-accept',forbidden:['backup.restore','database.clear','history.erase','qcm.attempt.update','publish','remote.fetch','self-approve']},queries:['getStateFingerprint','getAgentContext','listResources','getResource','listResourceVersions','resolveTarget','getWorkspaceSummary','getReferenceSummary','getStorageDiagnostics'],navigation:['navigateAgentTarget','setAgentCompareState','openAgentSystemSurface'],actions:Object.entries(operationRegistry).map(([kind,d])=>({kind,classification:d.stateClass==='workspace'?'navigation':'write',resourceTypes:d.resourceTypes,baseRequired:d.base,payloadSchema:{type:'object',additionalProperties:false,required:d.required,properties:Object.fromEntries(d.payloadFields.map(k=>[k,{schemaRef:'V22_AI_CHANGESET_SPEC.md#'+kind+'.'+k}]))},limits:HISTORY_LIMITS,reviewRequired:true,resultingStateClass:d.stateClass,atomic:true,description:d.description}))};}
