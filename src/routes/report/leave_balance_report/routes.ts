import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['report'];

export const leaveHistoryBalanceReport = createRoute({
  path: '/report/leave-history-report',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
      'The leave history report',
    ),
  },
});

export type LeaveHistoryBalanceReportRoute = typeof leaveHistoryBalanceReport;
