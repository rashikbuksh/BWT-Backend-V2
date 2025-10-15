import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { challan, challan_entry } from '@/routes/delivery/schema';
import createApi from '@/utils/api';

import type { DashboardReportRoute, DeliveredCountRoute, OrderAndProductCountRoute, OrderDiagnosisCountRoute, QcCountRoute, ReadyForDeliveryCountRoute, RepairCountRoute } from './routes';

import { order } from '../schema';

const orderTable = alias(order, 'work_order');

export const orderAndProductCount: AppRouteHandler<OrderAndProductCountRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const resultPromise = sql`
    SELECT
      COUNT(DISTINCT wo.uuid)::float8 AS order_count,
      COALESCE(SUM(wo.quantity), 0)::float8 AS product_quantity
    FROM work.order wo
    LEFT JOIN work.info ON wo.info_uuid = info.uuid
    WHERE
      info.is_product_received = TRUE
      AND wo.is_return = FALSE
      ${engineer_uuid ? sql`AND (info.engineer_uuid = ${engineer_uuid} OR ${engineer_uuid} IS NULL)` : sql`AND TRUE`}
  `;

  const data = await db.execute(resultPromise);

  return c.json((data.rows && data.rows[0]) || {}, HSCode.OK);
};

export const orderDiagnosisCount: AppRouteHandler<OrderDiagnosisCountRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const resultPromise = sql`
    SELECT
      COUNT(DISTINCT wo.uuid)::float8 AS order_count,
      COALESCE(SUM(wo.quantity), 0)::float8 AS product_quantity
    FROM work.order wo
    LEFT JOIN work.info ON wo.info_uuid = info.uuid
    WHERE
      info.is_product_received = TRUE
      AND wo.is_diagnosis_need = TRUE
      AND wo.is_proceed_to_repair = FALSE
      ${engineer_uuid ? sql`AND (info.engineer_uuid = ${engineer_uuid} OR ${engineer_uuid} IS NULL)` : sql`AND TRUE`}
  `;

  const data = await db.execute(resultPromise);

  return c.json((data.rows && data.rows[0]) || {}, HSCode.OK);
};

export const repairCount: AppRouteHandler<RepairCountRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .where(
      and(
        eq(orderTable.is_proceed_to_repair, true),
        eq(orderTable.is_transferred_for_qc, false),
        eq(orderTable.is_ready_for_delivery, false),
        eq(orderTable.is_return, false),
        engineer_uuid ? eq(orderTable.engineer_uuid, engineer_uuid) : sql`TRUE`,
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const qcCount: AppRouteHandler<QcCountRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .where(
      and(
        eq(orderTable.is_proceed_to_repair, true),
        eq(orderTable.is_transferred_for_qc, true),
        eq(orderTable.is_ready_for_delivery, false),
        engineer_uuid ? eq(orderTable.engineer_uuid, engineer_uuid) : sql`TRUE`,
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const readyForDeliveryCount: AppRouteHandler<ReadyForDeliveryCountRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(
      and(
        eq(orderTable.is_proceed_to_repair, true),
        eq(orderTable.is_ready_for_delivery, true),
        sql`${challan_entry.uuid} IS NULL`,
        eq(orderTable.is_return, false),
        engineer_uuid ? eq(orderTable.engineer_uuid, engineer_uuid) : sql`TRUE`,
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const deliveredCount: AppRouteHandler<DeliveredCountRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(
      and(
        eq(orderTable.is_proceed_to_repair, true),
        eq(orderTable.is_ready_for_delivery, true),
        eq(challan.is_delivery_complete, true),
        engineer_uuid ? eq(orderTable.engineer_uuid, engineer_uuid) : sql`TRUE`,
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const dashboardReport: AppRouteHandler<DashboardReportRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const api = createApi(c);
  const [
    receivedCount,
    diagnosisCount,
    repairCountResult,
    qcCountResult,
    readyForDeliveryCountResult,
    deliveredCountResult,
  ] = await Promise.all([
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-and-product-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/order-and-product-count').then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/order-diagnosis-count').then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/repair-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/repair-count').then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/qc-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/qc-count').then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/ready-for-delivery-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/ready-for-delivery-count').then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/delivered-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/delivered-count').then(res => res.data),
  ]);

  return c.json({
    received: receivedCount,
    diagnosis: diagnosisCount,
    repair: repairCountResult,
    qc: qcCountResult,
    readyForDelivery: readyForDeliveryCountResult,
    delivered: deliveredCountResult,
  });
};
