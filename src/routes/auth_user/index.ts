import { auth } from '@/lib/auth';
import { createRouter } from '@/lib/create_app';

// import auths from './auths';

const router = createRouter()
  // .route('/', auths)
  .on(['POST', 'GET', 'OPTIONS'], '/api/auth/**', c => auth.handler(c.req.raw));

export default router;
