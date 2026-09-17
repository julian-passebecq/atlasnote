import React,{useState} from '../vendor/react.mjs';
import {Field} from '../components/Modal.js';
import {uid} from '../core/workspace.js';
import type {QcmDocument,QcmQuestion} from './model.js';

export function newQuestion():QcmQuestion{return {id:uid('question'),prompt:'',options:[{id:uid('option'),text:''},{id:uid('option'),text:''}],correctOptionIds:[]};}
/** Answer mode is a draft affordance. The existing format derives it from correct answers. */
export function QcmFields({source,onChange}:{source:QcmDocument;onChange:(value:QcmDocument)=>void}){
 const [multiple,setMultiple]=useState<Record<string,boolean>>({});
 function update(id:string,patch:Partial<QcmQuestion>){onChange({...source,questions:source.questions.map(q=>q.id===id?{...q,...patch}:q)});}
 return <div className="qcm-authoring"><Field label="Set title"><input aria-label="Set title" required maxLength={200} value={source.title} onChange={e=>onChange({...source,title:e.target.value})}/></Field>
 {source.questions.map((q,index)=>{const multi=multiple[q.id]??q.correctOptionIds.length>1;return <fieldset key={q.id} className="qcm-question-editor"><legend>Question {index+1}</legend>
 <Field label="Question prompt"><textarea aria-label={'Question '+(index+1)+' prompt'} required rows={3} value={q.prompt} onChange={e=>update(q.id,{prompt:e.target.value})}/></Field>
 <Field label="Answer mode"><select ref={el=>el?.setCustomValidity(multi&&q.correctOptionIds.length<2?"Mark at least two correct options.":"")} aria-label={'Question '+(index+1)+' answer mode'} value={multi?'multiple':'single'} onChange={e=>{const value=e.target.value==='multiple';setMultiple(m=>({...m,[q.id]:value}));if(!value)update(q.id,{correctOptionIds:q.correctOptionIds.slice(0,1)});}}><option value="single">Single answer</option><option value="multiple">Multiple answers</option></select></Field>
 <p className="secondary">{multi?'Mark at least two correct options.':'Mark one correct option.'} Each option can include an explanation.</p>
 {q.options.map((option,i)=><div className="qcm-option-editor" key={option.id}>
 <label className="inline-check"><input type={multi?'checkbox':'radio'} name={'correct-'+q.id} aria-label={'Question '+(index+1)+' option '+(i+1)+' correct'} checked={q.correctOptionIds.includes(option.id)} onChange={e=>update(q.id,{correctOptionIds:multi?(e.target.checked?[...q.correctOptionIds,option.id]:q.correctOptionIds.filter(id=>id!==option.id)):[option.id]})}/>Correct</label>
 <Field label={'Option '+(i+1)}><input aria-label={'Question '+(index+1)+' option '+(i+1)} required value={option.text} onChange={e=>update(q.id,{options:q.options.map(o=>o.id===option.id?{...o,text:e.target.value}:o)})}/></Field>
 <Field label="Option explanation"><textarea aria-label={'Question '+(index+1)+' option '+(i+1)+' explanation'} rows={2} value={option.explanation??''} onChange={e=>update(q.id,{options:q.options.map(o=>o.id===option.id?{...o,explanation:e.target.value}:o)})}/></Field>
 <button type="button" disabled={q.options.length<=2} onClick={()=>update(q.id,{options:q.options.filter(o=>o.id!==option.id),correctOptionIds:q.correctOptionIds.filter(id=>id!==option.id)})}>Remove option {i+1}</button>
 </div>)}
 {multi&&q.correctOptionIds.length<2&&<p role="alert">Multiple-answer questions need at least two correct options.</p>}
 <button type="button" disabled={q.options.length>=6} onClick={()=>update(q.id,{options:[...q.options,{id:uid('option'),text:''}]})}>Add option</button>
 <Field label="Global explanation"><textarea aria-label={'Question '+(index+1)+' global explanation'} rows={3} value={q.explanation??''} onChange={e=>update(q.id,{explanation:e.target.value})}/></Field>
 <Field label="Optional follow-up"><textarea aria-label={'Question '+(index+1)+' follow-up'} rows={2} value={q.followUp??''} onChange={e=>update(q.id,{followUp:e.target.value})}/></Field>
 <button type="button" disabled={source.questions.length<=1} onClick={()=>onChange({...source,questions:source.questions.filter(item=>item.id!==q.id)})}>Remove question {index+1}</button>
 </fieldset>;})}<button type="button" onClick={()=>onChange({...source,questions:[...source.questions,newQuestion()]})}>Add question</button></div>;
}
