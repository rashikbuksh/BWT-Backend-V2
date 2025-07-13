import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.stock'];

export const list = createRoute({
  path: '/store/stock',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of stock',
    ),
  },
});

export const create = createRoute({
  path: '/store/stock',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The stock to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created stock',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/stock/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested stock',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'stock not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/stock/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The stock updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated stock',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'stock not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/stock/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'stock deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'stock not found',
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
