import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  // .openapi(routes.signin, handlers.signin)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);
  // .openapi(routes.getCanAccess, handlers.getCanAccess)
  // .openapi(routes.patchCanAccess, handlers.patchCanAccess)
  // .openapi(routes.patchStatus, handlers.patchStatus);

export default router;
