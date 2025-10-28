import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const lateReport = createRoute({
  path: '/report/late-report',
  method: 'get',
  summary: 'Late Report',
  description: 'Get the late report for an employee',
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
          date: z.string(),
          count: z.string(),
          id: z.string(),
          name: z.string(),
          shift: z.number(),
          entry: z.string(),
          late: z.string(),
        }),
      ),
      'The late report',
    ),
  },
  tags,
});

export const dailyLateReport = createRoute({
  path: '/report/daily-late-report',
  method: 'get',
  summary: 'Daily Late Report',
  description: 'Get the daily late report for an employee',
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      department_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          employee_uuid: z.string(),
          employee_name: z.string(),
          date: z.string(),
          late_count: z.number(),
          shift_name: z.string(),
          shift_start_time: z.string(),
          shift_end_time: z.string(),
        }),
      ),
      'The daily late report',
    ),
  },
  tags,
});

export type LateReportRoute = typeof lateReport;
export type DailyLateReportRoute = typeof dailyLateReport;
