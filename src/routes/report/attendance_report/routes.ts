import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const getEmployeeAttendanceReport = createRoute({
  path: '/report/attendance-report/{employee_uuid}',
  method: 'get',
  summary: 'Attendance Report',
  description: 'Get the attendance report for an employee',
  request: {
    query: z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          user_uuid: z.string(),
          employee_name: z.string(),
          punch_date: z.date(),
          entry_time: z.string(),
          exit_time: z.string(),
          hours_worked: z.number(),
          expected_hours: z.number(),
        }),
      ),
      'The attendance report',
    ),
  },
  tags,
});

export type GetEmployeeAttendanceReportRoute = typeof getEmployeeAttendanceReport;
