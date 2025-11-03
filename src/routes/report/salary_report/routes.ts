import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const salaryReport = createRoute({
  path: '/report/salary-report/by/{fiscal_year_uuid}',
  method: 'get',
  summary: 'Get Salary Report',
  description: 'Get the Salary Report for a specific fiscal year',
  request: {
    params: z.object({
      fiscal_year_uuid: z.string(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          uuid: z.string(),
          employee_uuid: z.string(),
          employee_name: z.string(),
          employee_user_uuid: z.string(),
          employee_id: z.string(),
          department_uuid: z.string(),
          department_name: z.string(),
          designation_uuid: z.string(),
          designation_name: z.string(),
          type: z.string(),
          reason: z.string(),
          entry_time: z.string(),
          exit_time: z.string(),
          first_approver_uuid: z.string(),
          first_approver_name: z.string(),
          second_approver_uuid: z.string(),
          second_approver_name: z.string(),
          status: z.string(),
          applied_by_uuid: z.string(),
          applied_by_name: z.string(),
          applied_date: z.string(),
        }),
      ),
      'The Salary Report data',
    ),
  },
  tags,
});

export type SalaryReportRoute = typeof salaryReport;
