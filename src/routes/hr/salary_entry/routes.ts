import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.salary_entry'];

export const list = createRoute({
  path: '/hr/salary-entry',
  method: 'get',
  tags,
  request: {
    query: z.object({
      date: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of salary-entry',
    ),
  },
});

export const create = createRoute({
  path: '/hr/salary-entry',
  method: 'post',
  request: {
    body: jsonContentRequired(
      z.union([insertSchema, z.array(insertSchema)]),
      'The salary-entry or entries to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.union([selectSchema, z.array(selectSchema)]),
      'The created salary-entry or entries',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.union([insertSchema, z.array(insertSchema)])),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/salary-entry/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested salary-entry',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'salary-entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/salary-entry/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The salary-entry updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated salary-entry',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'salary-entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/salary-entry/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'salary-entry deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'salary-entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getEmployeeSalaryDetailsByYearDate = createRoute({
  path: '/hr/employee-salary-details/by/year-month/{year}/{month}',
  method: 'get',
  request: {
    params: z.object({
      year: z.string(),
      month: z.string(),
    }),
    query: z.object({
      employee_uuid: z.string().length(15).optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of employee salary details for the specified year and month',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        year: z.string(),
        month: z.string(),
      })),
      'Invalid year or month',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetEmployeeSalaryDetailsByYearDateRoute = typeof getEmployeeSalaryDetailsByYearDate;
