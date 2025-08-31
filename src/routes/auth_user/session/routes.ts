import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

import { selectSchema } from '../auths/utils';

const tags = ['auth_users.session'];

export const list = createRoute({
  path: '/get-session',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of sessions',
    ),
  },
});

export type ListRoute = typeof list;
