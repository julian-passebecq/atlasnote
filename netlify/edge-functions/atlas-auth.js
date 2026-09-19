import {gate} from '../lib/access.mjs';
export default (request, context) => gate(request, context, name => Netlify.env.get(name));
// Never exclude assets, PDF workers, deep links or index.html. Only terminal auth handlers.
export const config = {path: '/*', excludedPath: ['/__atlasnote_unlock', '/__atlasnote_lock'], onError: 'fail'};
