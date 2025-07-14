import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from './utils';

const tags = ['store.purchase_return'];

export const list = createRoute({
  path: '/store/purchase-return',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of purchase_return',
    ),
  },
});

export const create = createRoute({
  path: '/store/purchase-return',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The purchase_return to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created purchase_return',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/store/purchase-return/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested purchase_return',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase_return not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/store/purchase-return/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The purchase_return updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated purchase_return',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase_return not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/store/purchase-return/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'purchase_return deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase_return not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const getPurchaseReturnEntryDetailsByPurchaseReturnUuid = createRoute({
  path: '/store/purchase-return/purchase-return-entry-details/by/{purchase_return_uuid}',
  method: 'get',
  request: {
    params: z.object({
      purchase_return_uuid: z.string(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of purchase_return entries by purchase_return_uuid',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'purchase_return not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({
        purchase_return_uuid: z.string().uuid(),
      })),
      'Invalid purchase_return_uuid error',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetPurchaseReturnEntryDetailsByPurchaseReturnUuidRoute = typeof getPurchaseReturnEntryDetailsByPurchaseReturnUuid;
