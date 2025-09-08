import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getCommonUser, handlers.getCommonUser)
  .openapi(routes.getCanAccess, handlers.getCanAccess)
  .openapi(routes.patchCanAccess, handlers.patchCanAccess)
  .openapi(routes.patchUserStatus, handlers.patchUserStatus)
  .openapi(routes.patchUserPassword, handlers.patchUserPassword)
  .openapi(routes.patchRatingPrice, handlers.patchRatingPrice)
  .openapi(routes.loginUser, handlers.loginUser)
  // .openapi(routes.getUserByAuthUserId, handlers.getUserByAuthUserId)
  ;

export default router;
