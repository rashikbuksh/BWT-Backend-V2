import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.bill_info'];

export const list = createRoute({
  path: '/store/bill-info',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of bill-info',
    ),
  },
});

export const create = createRoute({
  path: '/store/bill-info',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The bill-info to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created bill-info',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/bill-info/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested bill-info',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'bill-info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/bill-info/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The bill-info updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated bill-info',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'bill-info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/bill-info/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'bill-info deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'bill-info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const billInfoWithOrderDetails = createRoute({
  path: '/store/bill-info-with-order-details',
  method: 'get',
  request: {
    query: z.object({
      bill_info_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        uuid: z.string().uuid(),
        order_details: z.array(
          z.object({
            uuid: z.string().uuid(),
            product_name: z.string(),
            quantity: z.number().int(),
            price: z.number().min(0),
          }),
        ),
      }),
      'The requested bill-info with order details',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'bill-info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const billInfoByUserUuid = createRoute({
  path: '/store/bill-info/by-user/{user_uuid}',
  method: 'get',
  tags,
  request: {
    params: z.object({
      user_uuid: z.string().uuid(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of bill-info by user uuid',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type BillInfoWithOrderDetailsRoute = typeof billInfoWithOrderDetails;
export type BillInfoByUserUuidRoute = typeof billInfoByUserUuid;
