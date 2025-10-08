import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.manual_entry'];

export const list = createRoute({
  path: '/hr/manual-entry',
  method: 'get',
  request: {
    query: z.object({
      q: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      sort: z.string().optional(),
      orderby: z.string().optional(),
      employee_uuid: z.string().optional(),
      type: z.string().optional(),
      approval: z.string().optional(),
    }),

  },

  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of manual-entry',
    ),
  },
});

export const create = createRoute({
  path: '/hr/manual-entry',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The manual-entry to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created manual-entry',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/manual-entry/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested manual-entry',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'manual-entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/manual-entry/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The manual-entry updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated manual-entry',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'manual-entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/manual-entry/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'manual-entry deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'manual-entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const manualEntryByEmployee = createRoute({
  path: '/hr/manual-entry/employee/{employee_uuid}',
  method: 'get',
  request: {
    params: z.object({
      employee_uuid: z.string(),
    }),
    query: z.object({
      field_visit_uuid: z.string().optional(),
      type: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The manual-entries for the employee',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'manual-entries not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid employee id error',
    ),
  },
});

export const selectAllManualEntryWithPaginationFieldVisit = createRoute({
  path: '/hr/manual-entry/field-visit/by/pagination',
  method: 'get',
  request: {
    query: z.object({
      approval: z.string().optional(),
      is_pagination: z.string().optional(),
      field_name: z.string().optional(),
      field_value: z.string().optional(),
      q: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      sort: z.string().optional(),
      orderby: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The manual-entries for the field visit',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'manual-entries not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid field visit id error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type ManualEntryByEmployeeRoute = typeof manualEntryByEmployee;
export type SelectAllManualEntryWithPaginationFieldVisitRoute = typeof selectAllManualEntryWithPaginationFieldVisit;
