import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.warehouse'];

export const list = createRoute({
  path: '/store/warehouse',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of warehouse',
    ),
  },
});

export const create = createRoute({
  path: '/store/warehouse',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The warehouse to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created warehouse',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/warehouse/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested warehouse',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'warehouse not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/warehouse/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The warehouse updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated warehouse',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'warehouse not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/warehouse/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'warehouse deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'warehouse not found',
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
