import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.signUp, handlers.signUp)
  .openapi(routes.signIn, handlers.signIn)
  .openapi(routes.signOut, handlers.signOut)
  .openapi(routes.changePassword, handlers.changePassword);

export default router;
