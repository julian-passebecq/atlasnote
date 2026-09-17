import fs from 'node:fs/promises';
import path from 'node:path';
export async function readFiles(root){const files=new Map();async function walk(dir,base=''){for(const ent of await fs.readdir(dir,{withFileTypes:true})){const key=base+ent.name;if(ent.isSymbolicLink())throw Error('Symlinks are not pack inputs: '+key);if(ent.isDirectory())await walk(path.join(dir,ent.name),key+'/');else if(ent.isFile())files.set(key,new Uint8Array(await fs.readFile(path.join(dir,ent.name))));}}await walk(root);return files;}
export async function writeJSON(file,obj){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(obj,null,2)+'\n');}
export async function writeFiles(root,files){for(const[p,b]of files){await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true});await fs.writeFile(path.join(root,p),b);}}
