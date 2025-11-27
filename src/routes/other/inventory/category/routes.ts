import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/inventory/category/value/label',
  method: 'get',
  tags,
  request: {
    query: z.object({
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
      'The valueLabel of category',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
