import type { AuthType } from '@/lib/auth';

import { betterAuth } from '@/middlewares/better_auth';
import { OpenAPIHono } from '@hono/zod-openapi';

import * as handlers from './handlers';
import * as routes from './routes';

// import auths from './auths';
export const authRouter = new OpenAPIHono<{ Variables: AuthType }>();

// Exception: bypass betterAuth for /auth/reference
authRouter.all('/auth/*', (c, next) => {
  if (c.req.path === '/api/auth/reference') {
    return next();
  }
  return betterAuth(c, next);
});

authRouter.openapi(routes.getUserByAuthUserId, async (c) => {
  const user = c.get('user');
  if (!user) {
    // Return a notFound response or a response matching the expected error type
    return c.notFound();
  }

  const response = handlers.getUserByAuthUserId(c);
  console.log('Response FROM HANDLER: ', response);
  return response;
});

export default authRouter;
