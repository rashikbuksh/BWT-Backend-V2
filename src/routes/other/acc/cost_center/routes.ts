import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/acc/cost-center/value/label',
  method: 'get',
  request: {
    query: z.object({
      ledger_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(z.object({
        value: z.string(),
        label: z.string(),
        invoice_no: z.string(),
        identifier: z.string(),
      })),
      'The valueLabel of cost-center',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
