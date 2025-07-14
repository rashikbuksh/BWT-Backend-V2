import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/store/warehouse/value/label',
  method: 'get',
  tags,
  request: {
    query: z.object({
      branch_uuid: z.string().optional(),
      purchase_uuid: z.string().optional(),
      product_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
        assigned: z.string().optional(),
        warehouse_name: z.string().optional(),
        branch_name: z.string().optional(),
      }),
      'The valueLabel of warehouse',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
