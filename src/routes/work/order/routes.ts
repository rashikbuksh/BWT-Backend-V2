import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['work.order'];

export const list = createRoute({
  path: '/work/order',
  method: 'get',
  tags,
  request: {
    query: z.object({
      qc: z.string().optional(),
      is_delivered: z.string().optional(),
      work_in_hand: z.string().optional(),
      customer_uuid: z.string().optional(),
      is_repair: z.string().optional(),
      is_return: z.string().optional(),
      is_delivery_complete: z.string().optional(),
      engineer_uuid: z.string().optional(),
      is_received: z.string().optional(),
      receive_type: z.string().optional(),
      bill_amount: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of order',
    ),
  },
});

export const create = createRoute({
  path: '/work/order',
  method: 'post',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: {
            ...insertSchema,
          },
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created order',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const createWithoutForm = createRoute({
  path: '/work/order-without-form',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The order to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created order',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/work/order/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested order',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'order not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/work/order/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: {
      content: {
        'multipart/form-data': {
          schema: {
            ...patchSchema,
          },
        },
      },
    },
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated order',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'order not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const patchWithoutForm = createRoute({
  path: '/work/order-without-form/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The order updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated order',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'order not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/work/order/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'order deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'order not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getDiagnosisDetailsByOrder = createRoute({
  path: '/work/diagnosis-details-by-order/{order_uuid}',
  method: 'get',
  request: {
    params: z.object({
      order_uuid: z.string().length(15),
    }),
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        problems_uuid: z.string(),
        problem_statement: z.string(),
        diagnosis_date: z.string(),
        diagnosis_time: z.string(),
      }),
      'The diagnosis details for the order',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'order not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ order_uuid: z.string() })),
      'Invalid order UUID error',
    ),
  },
});
export const getByInfo = createRoute({
  path: '/work/order-by-info/{info_uuid}',
  method: 'get',
  request: {
    params: z.object({
      info_uuid: z.string(),
    }),
    query: z.object({
      public: z.string().optional(),
      engineer_uuid: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The order matching the info',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'order not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ info: z.string() })),
      'Invalid info error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetDiagnosisDetailsByOrderRoute = typeof getDiagnosisDetailsByOrder;
export type GetByInfoRoute = typeof getByInfo;
export type CreateWithoutFormRoute = typeof createWithoutForm;
export type PatchWithoutFormRoute = typeof patchWithoutForm;
