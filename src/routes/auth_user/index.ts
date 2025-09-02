import { auth } from '@/lib/auth';
import { createRouter } from '@/lib/create_app';

import * as routes from './auths/routes';

const router = createRouter()
  .openapi(routes.changePassword, async (c) => {
    const response = await auth.handler(c.req.raw);
    // Adapt the response to the expected RouteConfigToTypedResponse type if needed
    // For example, if your framework expects a JSON response:
    return c.json(await response.json());
  })
  .on(['POST', 'GET', 'OPTIONS'], '/api/auth/**', c => auth.handler(c.req.raw));

export default router;
