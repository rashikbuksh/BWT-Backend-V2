import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.product_transfer'];

export const list = createRoute({
  path: '/store/product-transfer',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of product_transfer',
    ),
  },
});

export const create = createRoute({
  path: '/store/product-transfer',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The product_transfer to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created product_transfer',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/product-transfer/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested product_transfer',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'product_transfer not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/product-transfer/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The product_transfer updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated product_transfer',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'product_transfer not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/product-transfer/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'product_transfer deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'product_transfer not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getByOrderUuid = createRoute({
  path: '/store/product-transfer/by/{order_uuid}',
  method: 'get',
  request: {
    params: z.object({
      order_uuid: z.string().length(15, 'Order UUID must be 15 characters long'),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of product transfers by order UUID',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'No product transfers found for the given order UUID',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        order_uuid: z.string().length(15, 'Order UUID must be 15 characters long'),
      })),
      'Invalid order UUID error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetByOrderUuidRoute = typeof getByOrderUuid;
