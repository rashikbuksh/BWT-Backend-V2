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
      from_date: z.string().optional(),
      to_date: z.string().optional(),
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
      from_date: z.string().optional(),
      to_date: z.string().optional(),
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

export const orderDiagnosisCompleteCount = createRoute({
  path: '/work/dashboard/order-diagnosis-complete-count',
  method: 'get',
  tags,
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
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
      from_date: z.string().optional(),
      to_date: z.string().optional(),
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
      from_date: z.string().optional(),
      to_date: z.string().optional(),
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
      from_date: z.string().optional(),
      to_date: z.string().optional(),
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
      from_date: z.string().optional(),
      to_date: z.string().optional(),
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

export const dashboardAllReport = createRoute({
  path: '/work/dashboard-all/report',
  method: 'get',
  tags,
  request: {
    query: z.object({
      engineer_uuid: z.string().optional(),
      date: z.string().optional(),
    }),
  },
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        received_3_day: z.number().describe('Total number of orders received in last 3 days'),
        diagnosis_3_day: z.number().describe('Total number of diagnoses in last 3 days'),
        diagnosisComplete_3_day: z.number().describe('Total number of complete diagnoses in last 3 days'),
        repair_3_day: z.number().describe('Total number of repairs in last 3 days'),
        qc_3_day: z.number().describe('Total number of quality checks in last 3 days'),
        readyForDelivery_3_day: z.number().describe('Total number of orders ready for delivery in last 3 days'),
        delivered_3_day: z.number().describe('Total number of delivered orders in last 3 days'),

        received_7_day: z.number().describe('Total number of orders received in last 7 days'),
        diagnosis_7_day: z.number().describe('Total number of diagnoses in last 7 days'),
        diagnosisComplete_7_day: z.number().describe('Total number of complete diagnoses in last 7 days'),
        repair_7_day: z.number().describe('Total number of repairs in last 7 days'),
        qc_7_day: z.number().describe('Total number of quality checks in last 7 days'),
        readyForDelivery_7_day: z.number().describe('Total number of orders ready for delivery in last 7 days'),
        delivered_7_day: z.number().describe('Total number of delivered orders in last 7 days'),

        received_all: z.number().describe('Total number of orders received in all time'),
        diagnosis_all: z.number().describe('Total number of diagnoses in all time'),
        diagnosisComplete_all: z.number().describe('Total number of complete diagnoses in all time'),
        repair_all: z.number().describe('Total number of repairs in all time'),
        qc_all: z.number().describe('Total number of quality checks in all time'),
        readyForDelivery_all: z.number().describe('Total number of orders ready for delivery in all time'),
        delivered_all: z.number().describe('Total number of delivered orders in all time'),
      }),
      'Dashboard report summary',
    ),
  },
});

export const customerReceiveTypeCount = createRoute({
  path: '/work/dashboard/customer-receive-type-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        order_count: z.number().describe('Total number of orders received'),
        customer_drop_off_count: z.number().describe('Total number of orders returned'),
        home_received_count: z.number().describe('Total number of orders received at home'),
        courier_received_count: z.number().describe('Total number of orders received via courier'),
      }),
      'Customer receive type count',
    ),
  },
});

export const customerYetToReceiveCount = createRoute({
  path: '/work/dashboard/customer-yet-to-receive-count',
  method: 'get',
  tags,
  responses: {
    [HSCode.OK]: jsonContent(
      z.object({
        order_quantity: z.number().describe('Total number of orders entered'),
        customer_monitor_count: z.number().describe('Total number of monitor orders entered by customer'),
        customer_display_count: z.number().describe('Total number of display orders entered by customer'),
        customer_all_in_one_count: z.number().describe('Total number of all-in-one orders entered by customer'),
        customer_tv_count: z.number().describe('Total number of TV orders entered by customer'),
        customer_courier_count: z.number().describe('Total number of orders entered by customer via courier'),
        customer_accessories_count: z.number().describe('Total number of accessory orders entered by customer'),
        employee_entry_count: z.number().describe('Total number of orders entered by employee'),
      }),
      'Customer yet to receive count',
    ),
  },
});

export type OrderAndProductCountRoute = typeof orderAndProductCount;
export type OrderDiagnosisCountRoute = typeof orderDiagnosisCount;
export type OrderDiagnosisCompleteCountRoute = typeof orderDiagnosisCompleteCount;
export type RepairCountRoute = typeof repairCount;
export type QcCountRoute = typeof qcCount;
export type ReadyForDeliveryCountRoute = typeof readyForDeliveryCount;
export type DeliveredCountRoute = typeof deliveredCount;
export type DashboardReportRoute = typeof dashboardReport;
export type DashboardAllReportRoute = typeof dashboardAllReport;
export type CustomerReceiveTypeCountRoute = typeof customerReceiveTypeCount;
export type CustomerYetToReceiveCountRoute = typeof customerYetToReceiveCount;
