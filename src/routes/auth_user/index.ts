import { auth } from '@/lib/auth';
import { createRouter } from '@/lib/create_app';

// import auths from './auths';

const router = createRouter()
  .on(['POST'], '/api/auth/sign-in/email', c => c.text('hit', 200))
  .on(['POST', 'GET', 'OPTIONS'], '/api/auth/**', c => auth.handler(c.req.raw));

export default router;
