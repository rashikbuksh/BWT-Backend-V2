import * as HSCode from 'stoker/http-status-codes';
import { jsonContent } from 'stoker/openapi/helpers';

import { createRoute, z } from '@hono/zod-openapi';

const tags = ['dashboard'];

export const orderAndProductCount = createRoute({
  path: '/work/dashboard/order-and-product-count',
  method: 'get',
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
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
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          order_count: z.number().describe('The total count of distinct orders'),
          product_quantity: z.number().describe('The total quantity of products across all orders'),
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
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          order_count: z.number().describe('The total count of distinct orders'),
          product_quantity: z.number().describe('The total quantity of products across all orders'),
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
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          order_count: z.number().describe('The total count of distinct orders'),
          product_quantity: z.number().describe('The total quantity of products across all orders'),
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
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          order_count: z.number().describe('The total count of distinct orders'),
          product_quantity: z.number().describe('The total quantity of products across all orders'),
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
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.array(
        z.object({
          order_count: z.number().describe('The total count of distinct orders'),
          product_quantity: z.number().describe('The total quantity of products across all orders'),
        }),
      ),
      'The list of delivered orders',
    ),
  },
});

export const dashboardReport = createRoute({
  path: '/work/dashboard/report',
  method: 'get',
  tags,
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        total_orders: z.number().describe('Total number of orders'),
        total_products: z.number().describe('Total number of products across all orders'),
        total_diagnoses: z.number().describe('Total number of diagnoses'),
        total_repairs: z.number().describe('Total number of repairs'),
        total_qc_passed: z.number().describe('Total number of quality checks passed'),
        total_ready_for_delivery: z.number().describe('Total number of orders ready for delivery'),
        total_delivered: z.number().describe('Total number of delivered orders'),
      }),
      'Dashboard report summary',
    ),
  },
});

export type OrderAndProductCountRoute = typeof orderAndProductCount;
export type OrderDiagnosisCountRoute = typeof orderDiagnosisCount;
export type RepairCountRoute = typeof repairCount;
export type QcCountRoute = typeof qcCount;
export type ReadyForDeliveryCountRoute = typeof readyForDeliveryCount;
export type DeliveredCountRoute = typeof deliveredCount;
export type DashboardReportRoute = typeof dashboardReport;
