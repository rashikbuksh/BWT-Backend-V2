import Cache from 'memory-cache';
import * as HSCode from 'stoker/http-status-codes';

import { createRouter } from '@/lib/create_app';

import * as handlers from './handlers';
import * as routes from './routes';

const router = createRouter()
  .openapi(routes.list, async (c: any) => {
    // get all query params from the request and add them to the cache key
    const queryParams = c.req.valid('query');
    const queryString = Object.keys(queryParams)
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');
    const cacheKey = `info?${queryString}`;
    const cachedData = Cache.get(cacheKey);
    if (cachedData) {
      return c.json(cachedData, 200);
    }

    try {
      const response = await handlers.list(c, async () => {});

      // Normalize response data for caching and returning:
      // - if the response provides a json() method (e.g., Fetch Response), use it
      // - if the response is a TypedResponse-like object with a `body` property, use that
      // - otherwise, treat the response itself as the data
      let responseData: any;
      if (response && typeof (response as any).json === 'function') {
        responseData = await (response as any).json();
      }
      else if (response && (response as any).body !== undefined) {
        responseData = (response as any).body;
      }
      else {
        responseData = response;
      }

      console.warn('Caching info with key:', cacheKey);

      Cache.put(cacheKey, responseData, 2 * 60 * 1000);
      return c.json(responseData, 200);
    }
    catch (error: any) {
      console.warn('Error fetching order details:', error);
      return c.json({ error: 'Internal Server Error' }, HSCode.INTERNAL_SERVER_ERROR);
    }
  })
  .openapi(routes.create, (c: any) => {
    const cacheKey = `info`;
    const cachedKeys = Cache.keys().find(key => key.startsWith(cacheKey));
    if (cachedKeys) {
      Cache.del(cachedKeys);
    }
    return handlers.create(c, async () => {});
  })
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, (c: any) => {
    const cacheKey = `info`;
    const cachedKeys = Cache.keys().find(key => key.startsWith(cacheKey));
    console.warn('Patching info, clearing cache key:', cachedKeys);
    if (cachedKeys) {
      Cache.del(cachedKeys);
    }
    return handlers.patch(c, async () => {});
  })
  .openapi(routes.remove, (c: any) => {
    const cacheKey = `info`;
    const cachedKeys = Cache.keys().find(key => key.startsWith(cacheKey));
    if (cachedKeys) {
      Cache.del(cachedKeys);
    }
    return handlers.remove(c, async () => {});
  })
  .openapi(routes.getOrderDetailsByInfoUuid, handlers.getOrderDetailsByInfoUuid)
  .openapi(routes.getOneByUserUuid, handlers.getOneByUserUuid);

export default router;
