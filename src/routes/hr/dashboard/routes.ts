import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['hr.dashboard'];

export const getLateEmployeeAttendanceReport = createRoute({
  path: '/hr/dashboard/late-attendance',
  method: 'get',
  summary: 'Daily Late Attendance',
  description: 'Get the late attendance report for employees',
  request: {
    query: z.object({
      // from_date: z.string().optional(),
      // to_date: z.string().optional(),
      // month: z.string().optional(),
      employee_uuid: z.string().optional(),
      date: z.string().optional(),
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
      'The late attendance report for employees',
    ),
  },
  tags,
});

export const getAttendanceReport = createRoute({
  path: '/hr/dashboard/attendance',
  method: 'get',
  summary: 'Dashboard Attendance Report',
  description: 'Get the attendance report for a department',
  request: {
    query: z.object({
      department_uuid: z.string().optional(),
      date: z.string().optional(),
      // to_date: z.string().optional(),
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
      'The department attendance report',
    ),
  },
  tags,
});

export const getMonthlyAttendanceReport = createRoute({
  path: '/hr/monthly-attendance-report',
  method: 'get',
  summary: 'Monthly Attendance Report',
  description: 'Get the monthly attendance report for an employee',
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
          user_uuid: z.string(),
          employee_name: z.string(),
          month: z.string(),
          year: z.string(),
          total_days_present: z.number(),
          total_hours_worked: z.number(),
        }),
      ),
      'The monthly attendance report',
    ),
  },
  tags,
});

export const getOnLeaveEmployeeAttendanceReport = createRoute({
  path: '/hr/dashboard/on-leave-attendance',
  method: 'get',
  summary: 'On Leave Attendance Report',
  description: 'Get the on-leave attendance report for employees',
  request: {
    query: z.object({
      // from_date: z.string().optional(),
      // to_date: z.string().optional(),
      // month: z.string().optional(),
      employee_uuid: z.string().optional(),
      date: z.string().optional(),
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
      'The on-leave attendance report for employees',
    ),
  },
  tags,
});

export type GetLateEmployeeAttendanceReportRoute = typeof getLateEmployeeAttendanceReport;
export type GetAttendanceReportRoute = typeof getAttendanceReport;
export type GetMonthlyAttendanceReportRoute = typeof getMonthlyAttendanceReport;
export type GetOnLeaveEmployeeAttendanceReportRoute = typeof getOnLeaveEmployeeAttendanceReport;
