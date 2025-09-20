import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['zkteco'];

export const list = createRoute({
  path: '/zkteco/socket',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(z.object({
        uuid: z.string().uuid(),
        name: z.string(),
        ip: z.string().ip(),
        port: z.number().int(),
        inport: z.number().int(),
        timeout: z.number().int(),
      })),
      'The list of zkteco devices',
    ),
  },
});

export type ListRoute = typeof list;
