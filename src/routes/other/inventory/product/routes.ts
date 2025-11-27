import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/inventory/product/value/label',
  method: 'get',
  tags,
  request: {
    query: z.object({
      uuid: z.string().uuid().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
        warehouse_1: z.number().optional(),
        warehouse_2: z.number().optional(),
        warehouse_3: z.number().optional(),
        warehouse_4: z.number().optional(),
        warehouse_5: z.number().optional(),
        warehouse_6: z.number().optional(),
        warehouse_7: z.number().optional(),
        warehouse_8: z.number().optional(),
        warehouse_9: z.number().optional(),
        warehouse_10: z.number().optional(),
        warehouse_11: z.number().optional(),
        warehouse_12: z.number().optional(),
      }),
      'The valueLabel of product',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
