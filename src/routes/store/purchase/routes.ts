import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.purchase'];

export const list = createRoute({
  path: '/store/purchase',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of purchase',
    ),
  },
});

export const create = createRoute({
  path: '/store/purchase',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The purchase to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created purchase',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/purchase/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested purchase',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/purchase/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The purchase updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated purchase',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/purchase/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'purchase deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getPurchaseEntryDetailsByPurchaseUuid = createRoute({
  path: '/store/purchase/purchase-entry-details/by/{purchase_uuid}',
  method: 'get',
  request: {
    params: z.object({
      purchase_uuid: z.string().uuid(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The purchase entry details',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase entry details not found',
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
export type GetPurchaseEntryDetailsByPurchaseUuidRoute = typeof getPurchaseEntryDetailsByPurchaseUuid;
