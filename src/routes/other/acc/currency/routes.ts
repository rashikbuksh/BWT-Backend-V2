import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/acc/currency/value/label',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
        conversion_rate: z.number(),
        default: z.boolean(),
        symbol: z.string(),
      }),
      'The valueLabel of currency',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
