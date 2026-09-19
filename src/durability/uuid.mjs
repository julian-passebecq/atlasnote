const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hex=n=>n.toString(16).padStart(2,'0');
/** RFC 4122 v4 identity that stays valid when randomUUID is unavailable on opaque origins. */
export function randomUuid(){
 const native=typeof crypto.randomUUID==='function'?crypto.randomUUID():'';
 if(UUID.test(native))return native;
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const h=[...bytes].map(hex);return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10).join('');
}
