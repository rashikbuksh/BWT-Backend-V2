import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const leaveHistoryReport = createRoute({
  path: '/report/leave-history-report',
  method: 'get',
  summary: 'Leave History Report',
  description: 'Get the leave history report for an employee',
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      category_uuid: z.string().optional(),
      approval: z.string().optional(),
    }),
  },
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

export const leaveBalanceReport = createRoute({
  path: '/report/leave-balance-report',
  method: 'get',
  summary: 'Leave Balance Report',
  description: 'Get the leave balance report for an employee',
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }),
  },
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
      'The leave balance report',
    ),
  },
  tags,
});

export type LeaveHistoryReportRoute = typeof leaveHistoryReport;
export type LeaveBalanceReportRoute = typeof leaveBalanceReport;
