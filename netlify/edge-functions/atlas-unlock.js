import {unlock} from '../lib/access.mjs';
export default request => unlock(request, name => Netlify.env.get(name));
export const config = {path: '/__atlasnote_unlock', onError: 'fail',
 rateLimit: {windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain']}};
