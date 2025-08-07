import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const dailyAbsentReport = createRoute({
  path: '/report/daily-absent-report',
  method: 'get',
  summary: 'Daily Absent Report',
  description: 'Get the daily absent report for an employee',
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      department_uuid: z.string().optional(),
      status: z.string().optional(),
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
      'The daily absent report',
    ),
  },
  tags,
});

export const absentSummaryReport = createRoute({
  path: '/report/absent-summary-report',
  method: 'get',
  summary: 'Absent Summary Report',
  description: 'Get the absent summary report for an employee',
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      status: z.string().optional(),
      department_uuid: z.string().optional(),
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
      'The absent summary report',
    ),
  },
  tags,
});

export type DailyAbsentReportRoute = typeof dailyAbsentReport;
export type AbsentSummaryReportRoute = typeof absentSummaryReport;
