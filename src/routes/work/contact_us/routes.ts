import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['work.contact_us'];

export const list = createRoute({
  path: '/work/contact-us',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of contact us entries',
    ),
  },
});

export const create = createRoute({
  path: '/work/contact-us',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The contact us entry to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created contact us entry',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/work/contact-us/{id}',
  method: 'get',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested contact us entry',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'contact us entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/work/contact-us/{id}',
  method: 'patch',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: jsonContentRequired(
      patchSchema,
      'The contact us entry updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated contact us entry',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'contact us entry not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/work/contact-us/{id}',
  method: 'delete',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'contact us entry deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'contact us entry not found',
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
