import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.postAuthToken, handlers.postAuthToken)
  .openapi(routes.getEmployeeFromZK, handlers.getEmployeeFromZK);

export default router;
