/* Deterministic guard against storing credentials in AtlasNote captures.
 * AtlasNote is not a vault: secret values belong in Power Ops / the OS credential store. */
export type SecretFinding={line:number;reason:string};
const SECRET_SHAPES:[RegExp,string][]=[
 [/-----BEGIN [A-Z ]*PRIVATE KEY-----/,'private key block'],
 [/\bgh[pousr]_[A-Za-z0-9]{30,}/,'GitHub token'],[/\bgithub_pat_[A-Za-z0-9_]{40,}/,'GitHub token'],[/\bglpat-[A-Za-z0-9_-]{20,}/,'GitLab token'],
 [/\bxox[abprs]-[A-Za-z0-9-]{10,}/,'Slack token'],[/\bsk-(?:ant-|proj-|live_|test_)?[A-Za-z0-9_-]{20,}/,'API secret key'],
 [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,'AWS access key'],[/\bAIza[0-9A-Za-z_-]{35}/,'Google API key'],[/\bnpm_[A-Za-z0-9]{36}\b/,'npm token'],
 [/\bdapi[0-9a-f]{32}\b/,'Databricks token'],[/\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,'JSON Web Token'],
 [/\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@/]+@/i,'credential inside a connection string'],
];
const SECRET_WORD=/(pass(?:word|wd|phrase)?|\bpwd\b|secret|token|api[\s_-]?key|access[\s_-]?key|private[\s_-]?key|recovery[\s_-]?(?:code|key)|\botp\b|bearer|authorization|connection[\s_-]?string|\bmongodb_uri\b|\bdatabase_url\b)/i;
/** A label that describes a secret rather than holding one ("Token ID", "vault label", "env name"). */
const DESCRIPTOR=/(?:\bid|\bids|\bname|\blabel|\bref|reference|\burl|\buri|\blink|location|\bpath|variable|\bvar|\benv|scope|\btype|expiry|expires|expiration|header|what|where|used by|note|hint|policy|rotation)\s*$/i;
const PLACEHOLDER=/^(?:<[^>]*>?|\$\{?[A-Za-z_]+\}?|\*+|x{3,}|\.{3}|-+|—|stored|see|in|never|not|none|n\/a|tbd|todo|redacted|hidden|vault|powerops|power|ask|empty|unset|null|false|true)$/i;
/** Deterministic, conservative check for secret values. It never reports the value itself. */
export function detectSecrets(text:string):SecretFinding[]{
 const out:SecretFinding[]=[];if(typeof text!=='string'||!text)return out;
 text.split(/\r?\n/).forEach((line,i)=>{
  for(const [re,reason] of SECRET_SHAPES)if(re.test(line)){out.push({line:i+1,reason});return;}
  const kv=/^\s*(?:[-*•>]\s*)?([^:=\n]{1,80}?)\s*[:=]\s*["'`]?([^\s"'`,;]+)/.exec(line);
  const name=kv?.[1].trim().replace(/\s+value$/i,'')??'';if(kv&&SECRET_WORD.test(name)&&!DESCRIPTOR.test(name)&&!/https?$/i.test(kv[1].trim())&&kv[2].length>=6&&!PLACEHOLDER.test(kv[2]))out.push({line:i+1,reason:'value assigned to "'+kv[1].trim().slice(0,40)+'"'});
 });
 return out;
}
export function secretMessage(findings:SecretFinding[]):string{return 'AtlasNote does not store secret values. Remove or replace with a vault label: '+findings.slice(0,5).map(f=>'line '+f.line+' ('+f.reason+')').join(', ')+(findings.length>5?' and '+(findings.length-5)+' more.':'.');}
export function assertNoSecrets(...texts:(string|undefined)[]){for(const t of texts){const f=detectSecrets(t??'');if(f.length)throw Error(secretMessage(f));}}

