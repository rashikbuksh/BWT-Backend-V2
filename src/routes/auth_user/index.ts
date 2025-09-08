import { auth } from '@/lib/auth';
import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';

// import auths from './auths';

const router = createRouter()
  .on(['POST', 'GET', 'OPTIONS'], '/api/auth/**', c => auth.handler(c.req.raw))
  .on('GET', '/auth/user/:auth_user_id', handlers.getUserByAuthUserId);

export default router;
