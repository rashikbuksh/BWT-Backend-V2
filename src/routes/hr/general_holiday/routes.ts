import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.general_holiday'];

export const list = createRoute({
  path: '/hr/general-holiday',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of general-holiday',
    ),
  },
});

export const create = createRoute({
  path: '/hr/general-holiday',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The general-holiday to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created general-holiday',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/general-holiday/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested general-holiday',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'General-holiday not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/general-holiday/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The general-holiday updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated general-holiday',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'General-holiday not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/general-holiday/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'General-holiday deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'General-holiday not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getAllGeneralAndSpecialHolidays = createRoute({
  path: '/hr/all-holidays',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          uuid: z.string(),
          id: z.number(),
          name: z.string(),
          from_date: z.string(),
          to_date: z.string(),
          type: z.enum(['General', 'Special']),
          created_by: z.string(),
          created_by_name: z.string().nullable(),
          created_at: z.string(),
          updated_at: z.string(),
          remarks: z.string().nullable(),
        }),
      ),
      'The list of all general and special holidays',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetAllGeneralAndSpecialHolidaysRoute = typeof getAllGeneralAndSpecialHolidays;
