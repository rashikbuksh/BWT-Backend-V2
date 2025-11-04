import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.punch_log'];

export const list = createRoute({
  path: '/hr/punch-log',
  method: 'get',
  tags,
  request: {
    query: z.object({
      employee_uuid: z.string().optional(),
      date: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of punch-log',
    ),
  },
});

export const create = createRoute({
  path: '/hr/punch-log',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The punch-log to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created punch-log',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/punch-log/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested punch-log',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Punch-log not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/punch-log/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The punch-log updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated punch-log',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Punch-log not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/punch-log/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Punch-log deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Punch-log not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const SelectLateEntryDateByEmployeeUuid = createRoute({
  path: '/hr/punch-log/late-entry/{employee_uuid}',
  method: 'get',
  request: {
    params: z.object({
      employee_uuid: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The late entry dates for the employee',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid employee id error',
    ),
  },
});

export const SelectEmployeePunchLogPerDayByEmployeeUuid = createRoute({
  path: '/hr/punch-log/employee/{employee_uuid}/per-day',
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
      'The punch logs for the employee per day',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid employee id error',
    ),
  },
});

export const SelectEmployeeLateDayByEmployeeUuid = createRoute({
  path: '/hr/punch-log-late-day',
  method: 'get',
  request: {
    // params: z.object({
    //   employee_uuid: z.string().optional(),
    // }),
    query: z.object({
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      employee_uuid: z.string().optional(),
      apply_late_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The late days for the employee',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Employee not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid employee id error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type SelectLateEntryDateByEmployeeUuidRoute = typeof SelectLateEntryDateByEmployeeUuid;
export type SelectEmployeePunchLogPerDayByEmployeeUuidRoute = typeof SelectEmployeePunchLogPerDayByEmployeeUuid;
export type SelectEmployeeLateDayByEmployeeUuidRoute = typeof SelectEmployeeLateDayByEmployeeUuid;
