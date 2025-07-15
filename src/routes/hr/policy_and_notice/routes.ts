import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.policy_and_notice'];

export const list = createRoute({
  path: '/hr/policy-and-notice',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of policy-and-notice',
    ),
  },
});

export const create = createRoute({
  path: '/hr/policy-and-notice',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The policy-and-notice to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created policy-and-notice',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/policy-and-notice/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested policy-and-notice',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Policy-and-notice not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/policy-and-notice/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The policy-and-notice updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated policy-and-notice',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Policy-and-notice not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/policy-and-notice/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Policy-and-notice deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Policy-and-notice not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getPolicy = createRoute({
  path: '/hr/policy-and-notice-only-policy',
  method: 'get',
  request: {
    query: z.object({
      type: z.string().optional(),
      status: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of policy-and-notice',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        type: z.string().optional(),
        status: z.string().optional(),
      })),
      'The validation error(s)',
    ),
  },
});
export const getNotice = createRoute({
  path: '/hr/policy-and-notice-only-notice',
  method: 'get',
  request: {
    query: z.object({
      type: z.string().optional(),
      status: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of policy-and-notice',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        type: z.string().optional(),
        status: z.string().optional(),
      })),
      'The validation error(s)',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetPolicyRoute = typeof getPolicy;
export type GetNoticeRoute = typeof getNotice;
