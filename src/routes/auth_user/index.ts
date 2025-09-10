import type { AuthType } from '@/lib/auth';

import * as HSCode from 'stoker/http-status-codes';

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

authRouter.openapi(routes.getUserByAuthUserId, (c: any) => {
  const user = c.get('user');
  if (!user) {
    // Return a notFound TypedResponse
    return c.json({ message: 'Unauthorized' }, HSCode.UNAUTHORIZED);
  }

  // Ensure the handler returns the expected TypedResponse type
  const response = handlers.getUserByAuthUserId(c);

  console.log('Response FROM HANDLER: ', response);

  if (!response) {
    // Return a TypedResponse for not found
    return c.json({ message: 'data not found' }, HSCode.NOT_FOUND);
  }

  // Return as TypedResponse with correct status and format
  return c.json(response, HSCode.OK);
});

export default authRouter;
