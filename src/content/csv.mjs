/** Bounded UTF-8 CSV -> existing canonical Notebook blocks. No storage writes. */
export function parseCSV(input){
 if(typeof input!=='string'||new TextEncoder().encode(input).length>2_000_000)throw Error('CSV exceeds 2 MB');
 let text=input.replace(/^\uFEFF/,'');
 let delimiter=',';
 if(/^sep=[,;\t]\r?\n/.test(text)){delimiter=text[4];text=text.replace(/^sep=.[\r\n]+/,'');}
 else {let quoted=false,counts={',':0,';':0,'\t':0};for(let i=0;i<text.length;i++){const c=text[i];if(c==='"')quoted=!quoted;else if(!quoted&&(c==='\n'||c==='\r'))break;else if(!quoted&&c in counts)counts[c]++;}delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];}
 const records=[];let row=[],cell='',quoted=false,closed=false;
 const field=()=>{row.push(cell);cell='';closed=false;if(row.length>32)throw Error('CSV exceeds 32 columns');};
 const record=()=>{field();if(row.some(c=>c.trim()))records.push(row);row=[];if(records.length>5001)throw Error('CSV exceeds 5,000 rows');};
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else {quoted=false;closed=true;}}else cell+=c;continue;}
  if(c===delimiter){field();continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;record();continue;}
  if(c==='"'){if(cell||closed)throw Error('Unexpected quote in CSV');quoted=true;continue;}
  if(closed){if(c===' '||c==='\t')continue;throw Error('Unexpected text after quoted CSV field');}
  cell+=c;
 }
 if(quoted)throw Error('Unclosed quoted CSV field');
 if(cell||row.length||closed)record();
 if(records.length<2)throw Error('CSV needs column headings and at least one data row');
 const columns=records.shift().map((c,i)=>c.trim()||'Column '+(i+1));
 for(const [i,r] of records.entries()){if(r.length!==columns.length)throw Error(`CSV row ${i+2}: expected ${columns.length} columns, found ${r.length}`);}
 return {columns,rows:records};
}
export function csvWorkspace(spec,sheets){
 if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(spec.id))throw Error('Invalid CSV pack ID');
 const projectId='project.'+spec.id,nodes=[],pages=[];
 for(const sheet of sheets){
  if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,50}$/.test(sheet.id))throw Error('Invalid sheet ID');
  const {columns,rows}=parseCSV(sheet.csv),path=(sheet.folder||'Imported CSV').split('/');let children=nodes,folderPath='';
  for(const part of path){folderPath+='.'+part.toLowerCase().replace(/[^a-z0-9]+/g,'-');let folder=children.find(n=>n.id==='node.'+spec.id+folderPath);if(!folder){folder={id:'node.'+spec.id+folderPath,title:part,children:[]};children.push(folder);}children=folder.children;}
  const collection={id:'node.'+spec.id+'.'+sheet.id,title:sheet.title,children:[]};children.push(collection);
  for(let start=0;start<rows.length;start+=40){const number=Math.floor(start/40)+1,id=`page.${spec.id}.${sheet.id}.${number}`,chunk=rows.slice(start,start+40),title=sheet.title+(rows.length>40?' · '+number:'');
   pages.push({id,title,related:[],terms:[],summary:`${start+1}–${start+chunk.length} / ${rows.length}. Choose Columns, NO / EN or Lines to study.`,blocks:[{id:`block.${spec.id}.${sheet.id}.${number}`,type:'table',columns,rows:chunk}],sources:[{title:sheet.source?.workbook??sheet.file??sheet.title,note:sheet.source?.sheet?'Worksheet: '+sheet.source.sheet:'User-selected local CSV'}],tags:['subject:norsk','lang:nb','csv-table',...(sheet.level?['level:'+sheet.level]:[])],provenance:spec.provenance??'User-supplied CSV, retained as authored source. Translations and inflections have not been independently corrected.'});
   collection.children.push({id:`node.${spec.id}.${sheet.id}.${number}`,title,pageId:id});
  }
 }
 const manifest={format:'atlas-content-pack',schemaVersion:1,payloadSchema:'atlas.bundle@2',id:spec.id,version:spec.version??'1.0.0',title:spec.title,visibility:spec.visibility??'private',files:{projects:'projects.json',pages:'pages',glossary:'glossary.json'},requires:[],assets:[],provenance:{kind:'user-authored',note:spec.provenance??'User-selected CSV study material'}};
 const files=new Map(),put=(path,value)=>files.set(path,new TextEncoder().encode(JSON.stringify(value,null,2)+'\n')),root='packs/'+spec.id+'/';
 put('workspace.json',{format:'atlas-workspace',schemaVersion:1,title:spec.title,packsDirectory:'packs',disabledPackIds:[],groups:[{id:'group.norsk-csv',title:'Norsk study sheets',projectIds:[projectId]}]});
 put(root+'atlas-pack.json',manifest);put(root+'projects.json',[{id:projectId,title:spec.title,icon:'language',description:'Thematic vocabulary, grammar and writing tables. Choose which columns to study.',nodes}]);put(root+'glossary.json',[]);
 for(const page of pages)put(root+'pages/'+page.id+'.json',page);
 return files;
}
