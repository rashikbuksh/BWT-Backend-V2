import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { bulkInsertSchema, insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.employee'];

export const list = createRoute({
  path: '/hr/employee',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of employee',
    ),
  },
});

export const create = createRoute({
  path: '/hr/employee',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The employee to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created employee',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/employee/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested employee',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/employee/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The employee updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated employee',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/employee/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Employee deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getManualEntryDetailsByEmployee = createRoute({
  path: '/hr/manual-entry-details/by/{employee_uuid}',
  method: 'get',
  request: {
    params: z.object({
      employee_uuid: z.string(),
    }),
    query: z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      field_visit_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The employee entry details',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee entry details not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getEmployeeLeaveInformationDetails = createRoute({
  path: '/hr/employee-leave-information-details/by/{employee_uuid}',
  method: 'get',
  request: {
    params: z.object({
      employee_uuid: z.string(),
    }),
    query: z.object({
      apply_leave_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The employee leave information details',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee leave information details not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getEmployeeAttendanceReport = createRoute({
  path: '/hr/employee-attendance-report/by/{employee_uuid}',
  method: 'get',
  request: {
    params: z.object({
      employee_uuid: z.string(),
    }),
    query: z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The employee attendance report',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee attendance report not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getEmployeeSummaryDetailsByEmployeeUuid = createRoute({
  path: '/hr/employee-summary-report/by/{employee_uuid}',
  method: 'get',
  request: {
    params: z.object({
      employee_uuid: z.string(),
    }),
    query: z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The employee summary report',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee summary report not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const updateProfilePicture = createRoute({
  path: '/hr/employee/profile-picture/by/{employee_uuid}',
  method: 'patch',
  request: {
    params: z.object({
      employee_uuid: z.string(),
    }),
    body: {
      content: {
        'multipart/form-data': {
          schema: {
            ...insertSchema,
          },
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated employee profile picture',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'The validation error(s)',
    ),
  },
});

export const getBulkShiftForEmployee = createRoute({
  path: '/hr/employee-bulk-shift',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The bulk shift for employee',
    ),
  },
});

export const postBulkEmployeeInformation = createRoute({
  path: '/hr/employee-bulk-information',
  method: 'post',
  request: {
    body: jsonContentRequired(
      bulkInsertSchema,
      'The bulk employee information to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The bulk employee information',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.array(
          insertSchema.partial({
            uuid: true,
            user_uuid: true,
            workplace_uuid: true,
            created_by: true,
            created_at: true,
          }),
        ),
      ),
      'The validation error(s)',
    ),
  },
});

export const getEmployeeSalaryByFiscalYear = createRoute({
  path: '/hr/employee-salary/by/{fiscal_year_uuid}',
  method: 'get',
  request: {
    params: z.object({
      fiscal_year_uuid: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The employee salary for the fiscal year',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee salary for the fiscal year not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.object({
          employee_uuid: z.string(),
          fiscal_year_uuid: z.string(),
        }),
      ),
      'Invalid id error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetManualEntryByEmployeeRoute = typeof getManualEntryDetailsByEmployee;
export type GetEmployeeLeaveInformationDetailsRoute = typeof getEmployeeLeaveInformationDetails;
export type GetEmployeeAttendanceReportRoute = typeof getEmployeeAttendanceReport;
export type GetEmployeeSummaryDetailsByEmployeeUuidRoute = typeof getEmployeeSummaryDetailsByEmployeeUuid;
export type UpdateProfilePictureRoute = typeof updateProfilePicture;
export type GetBulkShiftForEmployeeRoute = typeof getBulkShiftForEmployee;
export type PostBulkEmployeeInformationRoute = typeof postBulkEmployeeInformation;
export type GetEmployeeSalaryByFiscalYearRoute = typeof getEmployeeSalaryByFiscalYear;
