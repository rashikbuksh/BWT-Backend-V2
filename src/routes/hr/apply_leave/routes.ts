import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['hr.apply_leave'];

export const list = createRoute({
  path: '/hr/apply-leave',
  method: 'get',
  request: {
    query: z.object({
      q: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
      sort: z.string().optional(),
      orderby: z.string().optional(),
      employee_uuid: z.string().optional(),
      approval: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of apply-leave',
    ),
  },
});

export const create = createRoute({
  path: '/hr/apply-leave',
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
      'The created apply-leave',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/apply-leave/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested apply-leave',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Configuration not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/apply-leave/{uuid}',
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
      'The updated apply-leave',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Configuration not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/apply-leave/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'Configuration deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'Configuration not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const selectAllApplyLeaveWithPagination = createRoute({
  path: '/hr/apply-leave/by/pagination',
  method: 'get',
  request: {
    query: z.object({
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('10'),
      approval: z.string().optional(),
      employee_uuid: z.string().optional(),
      leave_category_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
      sort: z.string().optional(),
      orderby: z.string().optional(),
      year: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of apply-leave',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type SelectAllApplyLeaveWithPaginationRoute = typeof selectAllApplyLeaveWithPagination;
