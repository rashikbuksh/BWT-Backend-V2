import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['report'];

export const leaveHistoryBalanceReport = createRoute({
  path: '/report/leave-history-report',
  method: 'get',
  summary: 'Leave History Balance Report',
  description: 'Get the leave history balance report for an employee',
  query: z.object({
    employee_uuid: z.string().optional(),
  }),
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          employee_uuid: z.string(),
          employee_name: z.string(),
          leave_category_uuid: z.string(),
          leave_category_name: z.string(),
          year: z.number(),
          type: z.string(),
          from_date: z.string(),
          to_date: z.string(),
          reason: z.string().optional(),
        }),
      ),
      'The leave history report',
    ),
  },
  tags,
});

export type LeaveHistoryBalanceReportRoute = typeof leaveHistoryBalanceReport;
