import { createRouter } from '@/lib/create_app';
import { cacheFunction } from '@/lib/variables';

import * as handlers from './handlers';
import * as routes from './routes';

const cacheKey = `work_info`;

const router = createRouter()
  .openapi(routes.list, async (c: any) => {
    return cacheFunction(c, cacheKey, handlers.list, 'create', 2 * 60 * 1000);
  })
  .openapi(routes.create, (c: any) => {
    return cacheFunction(c, cacheKey, handlers.create, 'other');
  })
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, (c: any) => {
    return cacheFunction(c, cacheKey, handlers.patch, 'other');
  })
  .openapi(routes.remove, (c: any) => {
    return cacheFunction(c, cacheKey, handlers.remove, 'other');
  })
  .openapi(routes.getOrderDetailsByInfoUuid, handlers.getOrderDetailsByInfoUuid)
  .openapi(routes.getOneByUserUuid, handlers.getOneByUserUuid);

export default router;
