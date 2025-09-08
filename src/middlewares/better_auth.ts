import type { AuthType } from '@/lib/auth';

import { createMiddleware } from 'hono/factory';

import { auth } from '@/lib/auth';

export const betterAuth = createMiddleware<{ Variables: AuthType }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session)
    return c.json({ error: 'Unauthorized' }, 401);

  c.set('session', session.session);
  c.set('user', session.user);
  await next();
});
