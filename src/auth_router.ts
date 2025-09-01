// Update the import path if the location or filename is different, for example:
import type { AuthType } from '@/lib/auth';

import { Hono } from 'hono';

import { auth } from '@/lib/auth';

import type { AppBindings } from './lib/types';

const router = new Hono<{ AppBindings: AppBindings; Variables: AuthType }>({
  strict: false,
});

router.on(['POST', 'GET'], '/api/auth/**', c => auth.handler(c.req.raw));

export default router;
