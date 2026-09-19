import {lock} from '../lib/access.mjs';
export default request => lock(request, name => Netlify.env.get(name));
export const config = {path: '/__atlasnote_lock', onError: 'fail'};
