import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['reports'];

export const fieldVisitReport = createRoute({
  path: '/report/field-visit-report',
  method: 'get',
  summary: 'Field Visit Report',
  description: 'Get the field visit report for an employee',
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      approval: z.string().optional(),
      status: z.string().optional(),
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
      'Field Visit Report',
    ),
  },
  tags,
});

export type FieldVisitReportRoute = typeof fieldVisitReport;
