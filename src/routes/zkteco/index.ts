import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.post, handlers.post)
  .openapi(routes.deviceHealth, handlers.deviceHealth)
  .openapi(routes.addBulkUsers, handlers.addBulkUsers);

export default router;
