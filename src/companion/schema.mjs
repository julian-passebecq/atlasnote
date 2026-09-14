/** Portable machine-readable companion contract. Cross-reference uniqueness,
 * exact document hash and physical pageCount equality are additionally checked
 * by validateCompanion before any local write. */
const id={type:'string',pattern:'^[A-Za-z0-9][A-Za-z0-9._-]*$',maxLength:180};
const short={type:'string',maxLength:240},long={type:'string',maxLength:10000};
const refs={type:'array',maxItems:10000,uniqueItems:true,items:{type:'integer',minimum:1,maximum:10000}};
const categories={type:'array',maxItems:500,items:id};
export const COMPANION_SCHEMA={
 $schema:'https://json-schema.org/draft/2020-12/schema',title:'AtlasNote PDF Companion',type:'object',additionalProperties:false,
 required:['schemaVersion','id','documentId','pageCount','title','createdAt','categories','pages','terms'],
 properties:{schemaVersion:{const:1},id,documentId:id,documentSha256:{type:'string',pattern:'^[a-f0-9]{64}$'},pageCount:{type:'integer',minimum:1,maximum:10000},title:short,generatedBy:{enum:['ai','manual']},createdAt:{type:'number',minimum:0},reviewed:{type:'boolean'},categories:{type:'array',maxItems:500,items:{$ref:'#/$defs/category'}},pages:{type:'object',maxProperties:10000,patternProperties:{'^[1-9][0-9]*$':{$ref:'#/$defs/page'}},additionalProperties:false},terms:{type:'array',maxItems:2000,items:{$ref:'#/$defs/term'}}},
 $defs:{
 category:{type:'object',additionalProperties:false,required:['id','title'],properties:{id,title:short,pageRefs:refs,pageRanges:{type:'array',maxItems:1000,items:{type:'array',minItems:2,maxItems:2,items:{type:'integer',minimum:1,maximum:10000}}},children:{type:'array',maxItems:500,items:{$ref:'#/$defs/category'}}}},
 term:{type:'object',additionalProperties:false,required:['id','label','definition','pageRefs'],properties:{id,label:short,definition:long,pageRefs:refs,aliases:{type:'array',maxItems:50,items:short},translation:long,example:long,importance:{enum:['core','supporting','detail']},categoryIds:categories,globalTermId:id}},
 page:{type:'object',additionalProperties:false,required:['page'],properties:{page:{type:'integer',minimum:1,maximum:10000},title:short,summary:long,keyPoints:{type:'array',maxItems:30,items:{type:'string',maxLength:2000}},categoryIds:categories,termIds:{type:'array',maxItems:2000,items:id}}}
 }
};
