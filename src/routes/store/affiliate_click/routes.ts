import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.affiliate_click'];

export const list = createRoute({
  path: '/store/affiliate-click',
  method: 'get',
  tags,
  request: {
    query: z.object({
      user_uuid: z.string().optional(),
      product_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of affiliate clicks',
    ),
  },
});

export const create = createRoute({
  path: '/store/affiliate-click',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The affiliate click to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created affiliate click',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/affiliate-click/{id}',
  method: 'get',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested affiliate click',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'affiliate click not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/affiliate-click/{id}',
  method: 'patch',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      patchSchema,
      'The affiliate click updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated affiliate click',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'affiliate click not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/affiliate-click/{id}',
  method: 'delete',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'affiliate click deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'affiliate click not found',
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
