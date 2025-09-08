import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

// import { selectSchema } from '../users/utils';

const tags = ['auth_user.user'];

export const getUserByAuthUserId = createRoute({
  path: '/auth/user/{auth_user_id}',
  method: 'get',
  tags,
  request: {
    params: z.object({
      auth_user_id: z.string(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        id: z.string(),
      }),
      'The user corresponding to the auth user id',
    ),
  },
});

export type GetUserByAuthUserIdRoute = typeof getUserByAuthUserId;
