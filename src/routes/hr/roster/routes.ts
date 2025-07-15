import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.roster'];

export const list = createRoute({
  path: '/hr/roster',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of roster',
    ),
  },
});

export const create = createRoute({
  path: '/hr/roster',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The roster to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created roster',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/roster/{id}',
  method: 'get',
  request: {
    params: z.object({
      id: z.coerce.number().int().positive(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested roster',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Roster not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ id: z.coerce.number().int().positive() })),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/roster/{id}',
  method: 'patch',
  request: {
    params: z.object({
      id: z.coerce.number().int().positive(),
    }),
    body: jsonContentRequired(
      patchSchema,
      'The roster updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated roster',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Roster not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(z.object({ id: z.coerce.number().int().positive() }))),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/roster/{id}',
  method: 'delete',
  request: {
    params: z.object({
      id: z.coerce.number().int().positive(),
    }),
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Roster deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Roster not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ id: z.coerce.number().int().positive() })),
      'Invalid id error',
    ),
  },
});

export const getRosterCalenderByEmployeeUuid = createRoute({
  path: '/hr/roster-calendar/by/{employee_uuid}/{year}/{month}',
  method: 'get',
  request: {
    params: z.object({
      employee_uuid: z.string(),
      year: z.string(),
      month: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The roster calendar for the employee',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Roster calendar not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        employee_uuid: z.string(),
        year: z.string(),
        month: z.string(),
      })),
      'Invalid id error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetRosterCalenderByEmployeeUuidRoute = typeof getRosterCalenderByEmployeeUuid;
