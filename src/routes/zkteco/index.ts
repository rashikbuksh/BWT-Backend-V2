import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.getRequest, handlers.getRequest)
  .openapi(routes.post, handlers.post)
  .openapi(routes.connectionTest, handlers.connectionTest)
  .openapi(routes.iclockRoot, handlers.iclockRoot)
  .openapi(routes.deviceHealth, handlers.deviceHealth)
  .openapi(routes.addBulkUsers, handlers.addBulkUsers)
  .openapi(routes.customCommand, handlers.customCommand)
  .openapi(routes.getRequest_legacy, handlers.getRequest_legacy)
  .openapi(routes.deviceCmd, handlers.deviceCmd);

export default router;
