import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema, unauthorizedSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, loginSchema, patchSchema, selectSchema } from '../users/utils';

const tags = ['hr.users'];

export const list = createRoute({
  path: '/hr/user',
  method: 'get',
  tags,
  request: {
    query: z.object({
      status: z.string().optional(),
      user_type: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of user',
    ),
  },
});

export const create = createRoute({
  path: '/hr/user',
  method: 'post',
  request: {
    body: jsonContentRequired(
      insertSchema,
      'The designation to create',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The created user',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(insertSchema),
      'The validation error(s)',
    ),
  },
});

export const getOne = createRoute({
  path: '/hr/user/{uuid}',
  method: 'get',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The requested user',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patch = createRoute({
  path: '/hr/user/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      patchSchema,
      'The user updates',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      selectSchema,
      'The updated user',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const remove = createRoute({
  path: '/hr/user/{uuid}',
  method: 'delete',
  request: {
    params: param.uuid,
  },
  tags,
  responses: {
    [HSCode.NO_CONTENT]: {
      description: 'User deleted',
    },
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

// export const signout = createRoute({
//   path: '/signout/{uuid}',
//   method: 'delete',
//   request: {
//     params: param.uuid,
//   },
//   tags,
//   responses: {
//     [HSCode.NO_CONTENT]: {
//       description: 'User Signout',
//     },
//     [HSCode.NOT_FOUND]: jsonContent(
//       notFoundSchema,
//       'User not found',
//     ),
//     [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
//       createErrorSchema(param.uuid),
//       'Invalid id error',
//     ),
//   },
// });

export const getCommonUser = createRoute({
  path: '/hr/user-common',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The list of common users',
    ),
  },
});

export const getCanAccess = createRoute({
  path: '/hr/user/can-access/{uuid}',
  method: 'get',
  tags,
  request: {
    params: param.uuid,
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        can_access: z.string(),
      }),
      'The valueLabel of user',
    ),
  },
});

export const patchCanAccess = createRoute({
  path: '/hr/user/can-access/{uuid}',
  method: 'patch',
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      z.object({
        can_access: z.string(),
        updated_at: z.string().optional(),
      }),
      'The can_access to update',
    ),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The updated user',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

// export const patchCanAccess = createRoute({
//   path: '/hr/user/can-access/{uuid}',
//   method: 'patch',
//   tags,
//   request: {
//     params: param.uuid,
//   },
//   responses: {
//     [HSCode.OK]: jsonContent(
//       z.array(selectSchema),
//       'The valueLabel of user',
//     ),
//   },
// });

export const patchUserStatus = createRoute({
  path: '/hr/user/status/{uuid}',
  method: 'patch',
  tags,
  request: {
    params: param.uuid,
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The valueLabel of user',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(param.uuid),
      'Invalid id error',
    ),
  },
});

export const patchUserPassword = createRoute({
  path: '/hr/user/password/{uuid}',
  method: 'patch',
  tags,
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      z.object({
        current_pass: z.string(),
        pass: z.string(),
        updated_at: z.string().optional(),
      }),
      'The password to update',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The updated user',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const patchRatingPrice = createRoute({
  path: '/hr/user/rating-price/{uuid}',
  method: 'patch',
  tags,
  request: {
    params: param.uuid,
    body: jsonContentRequired(
      z.object({
        rating_price: z.number(),
        updated_at: z.string().optional(),
      }),
      'The rating price to update',
    ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(selectSchema),
      'The updated user',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
  },
});

export const loginUser = createRoute({
  path: '/hr/user/login',
  method: 'post',
  request: {
    body: jsonContentRequired(
      loginSchema,
      'The user login',
    ),
  },
  tags,
  responses: {
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'User not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(patchSchema)
        .or(createErrorSchema(param.uuid)),
      'The validation error(s)',
    ),
    [HSCode.UNAUTHORIZED]: jsonContent(
      unauthorizedSchema,
      'Wrong password',
    ),
  },
});

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetCommonUserRoute = typeof getCommonUser;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;
export type GetCanAccessRoute = typeof getCanAccess;
export type PatchCanAccessRoute = typeof patchCanAccess;
export type PatchUserStatusRoute = typeof patchUserStatus;
export type PatchUserPasswordRoute = typeof patchUserPassword;
export type PatchRatingPriceRoute = typeof patchRatingPrice;
export type LoginRoute = typeof loginUser;
