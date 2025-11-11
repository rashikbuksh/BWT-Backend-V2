import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.affiliate'];

export const list = createRoute({
  path: '/store/affiliate',
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
      'The list of affiliates',
    ),
  },
});

export const create = createRoute({
  path: '/store/affiliate',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The affiliate to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created affiliate',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/affiliate/{id}',
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
      'The requested affiliate',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'affiliate not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/affiliate/{id}',
  method: 'patch',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      patchSchema,
      'The affiliate updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated affiliate',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'affiliate not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/affiliate/{id}',
  method: 'delete',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'affiliate deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'affiliate not found',
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
