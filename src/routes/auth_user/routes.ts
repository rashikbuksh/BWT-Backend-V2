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
        uuid: z.string(),
        name: z.string(),
        email: z.string(),
        designation_uuid: z.string(),
        designation: z.string(),
        department_uuid: z.string(),
        department: z.string(),
        ext: z.string(),
        phone: z.string(),
        created_at: z.string(),
        updated_at: z.string(),
        status: z.string(),
        remarks: z.string(),
        id: z.string(),
        user_type: z.string(),
        business_type: z.string(),
        where_they_find_us: z.string(),
        rating: z.string(),
        price: z.string(),
        auth_user_id: z.string(),
        address: z.string(),
        city: z.string(),
        district: z.string(),
      }),
      'The user corresponding to the auth user id',
    ),
  },
});

export type GetUserByAuthUserIdRoute = typeof getUserByAuthUserId;
