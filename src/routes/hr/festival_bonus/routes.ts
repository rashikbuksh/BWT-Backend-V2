import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.festival_bonus'];

export const list = createRoute({
  path: '/hr/festival-bonus',
  method: 'get',
  tags,
  request: {
    query: z.object({
      fiscal_year_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of festival-bonus',
    ),
  },
});

export const create = createRoute({
  path: '/hr/festival-bonus',
  method: 'post',
  request: {
    body: jsonContentRequired(
      z.preprocess(val => (Array.isArray(val) ? val : [val]), z.array(insertSchema)),
      'The festival-bonus to create (single object or array for bulk)',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.union([
        selectSchema,
        z.object({
          created_count: z.number(),
          created: z.array(z.string()),
        }),
      ]),
      'The created festival-bonus (single) or bulk-create summary',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      z.union([
        createErrorSchema(insertSchema),
        createErrorSchema(z.array(insertSchema)),
      ]),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/festival-bonus/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested festival-bonus',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Festival-bonus not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/festival-bonus/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The festival-bonus updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated festival-bonus',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Festival-bonus not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/festival-bonus/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Festival-bonus deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Festival-bonus not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
