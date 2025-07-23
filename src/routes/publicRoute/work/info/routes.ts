import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';
import { createErrorSchema } from 'stoker/openapi/schemas';

import { notFoundSchema } from '@/lib/constants';
import { createRoute, z } from '@hono/zod-openapi';

const tags = ['publics'];

export const getOrderDetailsByInfoUuidForPublic = createRoute({
  path: '/public/work/order-details-by-info/{info_uuid}',
  method: 'get',
  request: {
    params: z.object({
      info_uuid: z.string(),
    }),
    query: z.object({
      diagnosis: z.string().optional(),
      process: z.string().optional(),
    }),
  },
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(z.object({
        order_uuid: z.string(),
        order_number: z.string(),
        customer_name: z.string(),
        order_date: z.string(),
        status: z.string(),
      })),
      'The list of order details by info UUID',
    ),
    [HSCode.NOT_FOUND]: jsonContent(
      notFoundSchema,
      'info not found',
    ),
    [HSCode.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(z.object({ info_uuid: z.string() })),
      'Invalid info UUID error',
    ),
  },
});

export type GetOrderDetailsByInfoUuidForPublicRoute = typeof getOrderDetailsByInfoUuidForPublic;
