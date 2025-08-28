import * as HSCode from 'stoker/http-status-codes';
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema, unauthorizedSchema } from '@/lib/constants';
import * as param from '@/lib/param';
import { createRoute, z } from '@hono/zod-openapi';

import { insertSchema, patchSchema, selectSchema } from '../auths/utils';

const tags = ['auth_users.user'];

export const signUp = createRoute({
  path: '/sign-up/email',
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

export const signIn = createRoute({
  path: '/sign-in/email',
  method: 'post',
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

export const signOut = createRoute({
  path: '/sign-out',
  method: 'post',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string().default('Signed out successfully'),
      }),
      'Signed out successfully',
    ),
    [HSCode.UNAUTHORIZED]: jsonContent(
      unauthorizedSchema,
      'Unauthorized',
    ),
  },
});

export const changePassword = createRoute({
  path: '/change-password',
  method: 'post',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        message: z.string().default('Password changed successfully'),
      }),
      'Password changed successfully',
    ),
    [HSCode.UNAUTHORIZED]: jsonContent(
      unauthorizedSchema,
      'Unauthorized',
    ),
  },
});

export type SignUpRoute = typeof signUp;
export type SignInRoute = typeof signIn;
export type SignOutRoute = typeof signOut;
export type ChangePasswordRoute = typeof changePassword;
