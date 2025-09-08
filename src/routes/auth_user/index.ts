import type { AuthType } from '@/lib/auth';

import { Hono } from 'hono';

// import { createRouter } from '@/lib/create_app';
import { betterAuth } from '@/middlewares/better_auth';

import * as handlers from './handlers';

// import auths from './auths';

export const authRouter = new Hono<{ Variables: AuthType }>();

// Exception: bypass betterAuth for /api/auth/reference
authRouter.use((c, next) => {
  if (c.req.path === '/api/auth/reference') {
    return next();
  }
  return betterAuth(c, next);
});

authRouter.get('/api/auth/auth/user/:auth_user_id', async (c) => {
  const user = c.get('user');
  if (!user)
    return c.json({ error: 'Unauthorized' }, 401);

  return handlers.getUserByAuthUserId(c);
});

export default authRouter;
