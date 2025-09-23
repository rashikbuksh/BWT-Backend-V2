import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const getEmployeeAttendanceReport = createRoute({
  path: '/report/attendance-report',
  method: 'get',
  summary: 'Attendance Report',
  description: 'Get the attendance report for an employee',
  request: {
    query: z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      month: z.string().optional(),
      employee_uuid: z.string().optional(),
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

export const getDepartmentAttendanceReport = createRoute({
  path: '/report/department-attendance-report',
  method: 'get',
  summary: 'Department Attendance Report',
  description: 'Get the attendance report for a department',
  request: {
    query: z.object({
      department_uuid: z.string().optional(),
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
      'The department attendance report',
    ),
  },
  tags,
});

export const getMonthlyAttendanceReport = createRoute({
  path: '/report/monthly-attendance-report',
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

export const getDailyEmployeeAttendanceReport = createRoute({
  path: '/report/daily-attendance-report',
  method: 'get',
  summary: 'Daily Attendance Report',
  description: 'Get the attendance report for an employee',
  request: {
    query: z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      month: z.string().optional(),
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
      'The daily attendance report',
    ),
  },
  tags,
});

export type GetEmployeeAttendanceReportRoute = typeof getEmployeeAttendanceReport;
export type GetDepartmentAttendanceReportRoute = typeof getDepartmentAttendanceReport;
export type GetMonthlyAttendanceReportRoute = typeof getMonthlyAttendanceReport;
export type GetDailyEmployeeAttendanceReportRoute = typeof getDailyEmployeeAttendanceReport;
