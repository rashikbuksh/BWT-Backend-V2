import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['zkteco'];

export const postAuthToken = createRoute({
  path: '/zk/auth-token',
  method: 'post',
  tags,
  request: {
    // body: jsonContent(
    //   z.object({
    //     base_url: z.string().url().optional(),
    //     username: z.string().optional(),
    //     password: z.string().optional(),
    //     timeout_ms: z.number().int().min(1000).max(60000).optional(),
    //   }),
    //   'Optional override credentials',
    // ),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        token: z.string(),
      }),
      'The ZK auth token',
    ),
    [HSCode.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string() }),
      'Validation / missing configuration',
    ),
    [HSCode.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({ error: z.string() }),
      'Error message',
    ),
  },
});

export const getEmployeeFromZK = createRoute({
  path: '/zk/employee',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        count: z.number().int().nonnegative(),
        next: z.string().url().nullable(),
        previous: z.string().url().nullable(),
        msg: z.string().nullable(),
        code: z.number().int(),
        data: z.array(z.any()),
      }),
      'The ZK employee data',
    ),
    [HSCode.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string() }),
      'Validation / missing configuration',
    ),
    [HSCode.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({ error: z.string() }),
      'Error message',
    ),
  },
});

export const getZKDynamic = createRoute({
  path: '/zk/*',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.any(),
      'Proxy ZK response',
    ),
    [HSCode.BAD_REQUEST]: jsonContent(
      z.object({ error: z.string() }),
      'Validation / missing configuration',
    ),
    [HSCode.INTERNAL_SERVER_ERROR]: jsonContent(
      z.object({ error: z.string() }),
      'Error message',
    ),
  },
});

export type PostAuthTokenRoute = typeof postAuthToken;
export type GetEmployeeFromZKRoute = typeof getEmployeeFromZK;
export type GetZKDynamicRoute = typeof getZKDynamic;
