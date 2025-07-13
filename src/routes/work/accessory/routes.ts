import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['work.accessory'];

export const list = createRoute({
  path: '/work/accessory',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of accessory',
    ),
  },
});

export const create = createRoute({
  path: '/work/accessory',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The accessory to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created accessory',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/work/accessory/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested accessory',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'accessory not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/work/accessory/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The accessory updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated accessory',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'accessory not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/work/accessory/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'accessory deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'accessory not found',
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
