import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['dashboard'];

export const orderAndProductCount = createRoute({
  path: '/work/dashboard/order-and-product-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          order_count: z.number().describe('The total count of distinct orders'),
          product_quantity: z.number().describe('The total quantity of products across all orders'),
        }),
      ),
      'The list of orders',
    ),
  },
});

export const orderDiagnosisCount = createRoute({
  path: '/work/dashboard/order-diagnosis-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          diagnosis_count: z.number().describe('The total count of distinct diagnoses'),
        }),
      ),
      'The list of diagnoses',
    ),
  },
});

export const repairCount = createRoute({
  path: '/work/dashboard/repair-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          repair_count: z.number().describe('The total count of distinct repairs'),
        }),
      ),
      'The list of repairs',
    ),
  },
});

export const qcCount = createRoute({
  path: '/work/dashboard/qc-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          qc_count: z.number().describe('The total count of distinct quality checks'),
        }),
      ),
      'The list of quality checks',
    ),
  },
});

export const readyForDeliveryCount = createRoute({
  path: '/work/dashboard/ready-for-delivery-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          ready_for_delivery_count: z.number().describe('The total count of distinct orders ready for delivery'),
        }),
      ),
      'The list of orders ready for delivery',
    ),
  },
});

export const deliveredCount = createRoute({
  path: '/work/dashboard/delivered-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          delivered_count: z.number().describe('The total count of distinct delivered orders'),
        }),
      ),
      'The list of delivered orders',
    ),
  },
});

export type OrderAndProductCountRoute = typeof orderAndProductCount;
export type OrderDiagnosisCountRoute = typeof orderDiagnosisCount;
export type RepairCountRoute = typeof repairCount;
export type QcCountRoute = typeof qcCount;
export type ReadyForDeliveryCountRoute = typeof readyForDeliveryCount;
export type DeliveredCountRoute = typeof deliveredCount;
