import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/acc/ledger/value/label',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
        cost_center_count: z.number(),
        is_cash_ledger: z.boolean(),
        identifier: z.string(),
      }),
      'The valueLabel of ledger',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
