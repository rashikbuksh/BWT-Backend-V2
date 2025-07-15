import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['others'];

export const valueLabel = createRoute({
  path: '/other/hr/employee/value/label',
  method: 'get',
  tags,
  request: {
    query: z.object({
      // Define any query parameters if needed
      leave_policy_required: z.string().optional(),
      is_hr: z.string().optional(),
      is_line_manager: z.string().optional(),

    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
      'The valueLabel of employee',
    ),
  },
});

export type ValueLabelRoute = typeof valueLabel;
