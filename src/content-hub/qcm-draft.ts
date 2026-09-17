import type {QcmDocument} from './model.js';

/** Valid canonical questions encode mode by answer count; invalid drafts cannot. */
export function qcmAnswerModes(source:QcmDocument):Record<string,boolean>{
 return Object.fromEntries(source.questions.map(q=>[q.id,q.correctOptionIds.length>1]));
}
export function validateQcmDraftModes(source:QcmDocument,multiple:Record<string,boolean>){
 for(const q of source.questions)if(multiple[q.id]&&q.correctOptionIds.length<2)throw Error('Multiple-answer questions need at least two correct options.');
}
