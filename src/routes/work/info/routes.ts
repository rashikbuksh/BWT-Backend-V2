import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['work.info'];

export const list = createRoute({
  path: '/work/info',
  method: 'get',
  tags,
  request: {
    query: z.object({
      customer_uuid: z.string().optional(),
      status: z.string().optional(),
      orderType: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of info',
    ),
  },
});

export const create = createRoute({
  path: '/work/info',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The info to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created info',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/work/info/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
    query: z.object({
      public: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested info',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/work/info/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The info updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated info',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/work/info/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'info deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getOrderDetailsByInfoUuid = createRoute({
  path: '/work/order-details-by-info/{info_uuid}',
  method: 'get',
  request: {
    params: z.object({
      info_uuid: z.string(),
    }),
    query: z.object({
      diagnosis: z.string().optional(),
      process: z.string().optional(),
      is_update: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(z.object({
        order_uuid: z.string(),
        order_number: z.string(),
        customer_name: z.string(),
        order_date: z.string(),
        status: z.string(),
      })),
      'The list of order details by info UUID',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ info_uuid: z.string() })),
      'Invalid info UUID error',
    ),
  },

});

export const getOneByUserUuid = createRoute({
  path: '/work/info/by-user/{user_uuid}',
  method: 'get',
  request: {
    params: z.object({
      user_uuid: z.string(),
    }),
    query: z.object({
      public: z.string().optional(),
      diagnosis: z.string().optional(),
      process: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested info',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'info not found',
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
export type GetOrderDetailsByInfoUuidRoute = typeof getOrderDetailsByInfoUuid;
export type GetOneByUserUuidRoute = typeof getOneByUserUuid;
