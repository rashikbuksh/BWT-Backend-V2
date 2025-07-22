import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/store/purchase-entry/value/label',
  method: 'get',
  tags,
  request: {
    query: z.object({
      is_purchase_return_entry: z.string().optional(),
      warehouse_uuid: z.string().optional(),
      purchase_uuid: z.string().optional(),
      is_product_transfer: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
      'The valueLabel of purchase entry',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
