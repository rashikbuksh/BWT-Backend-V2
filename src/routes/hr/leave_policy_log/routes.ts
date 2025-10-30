import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.leave_policy_log'];

export const list = createRoute({
  path: '/hr/leave-policy-log',
  method: 'get',
  tags,
  request: {
    query: z.object({
      year: z.coerce.number().int().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of leave-policy-log',
    ),
  },
});

export const create = createRoute({
  path: '/hr/leave-policy-log',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The leave-policy-log to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created leave-policy-log',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/leave-policy-log/{uuid}',
  method: 'get',
  request: {
    params: z.object({
      uuid: z.string().length(15),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested leave-policy-log',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Leave-policy-log not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ id: z.coerce.number().int().positive() })),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/leave-policy-log/{uuid}',
  method: 'patch',
  request: {
    params: z.object({
      uuid: z.string().length(15),
    }),
    body: jsonContentRequired(
      patchSchema,
      'The leave-policy-log updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated leave-policy-log',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Leave-policy-log not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(z.object({ id: z.coerce.number().int().positive() }))),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/leave-policy-log/{uuid}',
  method: 'delete',
  request: {
    params: z.object({
      uuid: z.string().length(15),
    }),
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Leave-policy-log deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Leave-policy-log not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ id: z.coerce.number().int().positive() })),
      'Invalid id error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
