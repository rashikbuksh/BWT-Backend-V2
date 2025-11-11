import type { AppRouteHandler } from '@/lib/types';

import { and, eq, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { challan, challan_entry } from '@/routes/delivery/schema';
import createApi from '@/utils/api';

import type { CustomerReceiveTypeCountRoute, DashboardAllReportRoute, DashboardReportRoute, DeliveredCountRoute, OrderAndProductCountRoute, OrderDiagnosisCompleteCountRoute, OrderDiagnosisCountRoute, QcCountRoute, ReadyForDeliveryCountRoute, RepairCountRoute } from './routes';

import { order } from '../schema';

const orderTable = alias(order, 'work_order');

export const orderAndProductCount: AppRouteHandler<OrderAndProductCountRoute> = async (c: any) => {
  const { engineer_uuid, from_date, to_date } = c.req.valid('query');

  let query = sql`
    SELECT
      COUNT(DISTINCT wo.uuid)::float8 AS order_count,
      COALESCE(SUM(wo.quantity), 0)::float8 AS product_quantity
    FROM work.order wo
    LEFT JOIN work.info ON wo.info_uuid = info.uuid
    LEFT JOIN delivery.challan_entry ce ON wo.uuid = ce.order_uuid
    LEFT JOIN delivery.challan ch ON ce.challan_uuid = ch.uuid
    WHERE
      info.is_product_received = TRUE
      AND wo.is_diagnosis_need = FALSE
      AND wo.is_proceed_to_repair = FALSE
      AND wo.is_transferred_for_qc = FALSE
      AND wo.is_ready_for_delivery = FALSE
      AND wo.is_delivery_without_challan = FALSE
      AND ch.uuid IS NULL
      AND wo.is_return = FALSE`;

  // Build conditions dynamically
  if (from_date && to_date) {
    query = sql`${query}
      AND wo.created_at BETWEEN ${from_date}::timestamp AND ${to_date}::timestamp + INTERVAL '1 day'`;
  }

  if (engineer_uuid) {
    query = sql`${query}
      AND wo.engineer_uuid = ${engineer_uuid}`;
  }

  const data = await db.execute(query);

  return c.json((data.rows && data.rows[0]) || {}, HSCode.OK);
};

export const orderDiagnosisCount: AppRouteHandler<OrderDiagnosisCountRoute> = async (c: any) => {
  const { engineer_uuid, from_date, to_date } = c.req.valid('query');

  let query = sql`
    SELECT
      COUNT(DISTINCT wo.uuid)::float8 AS order_count,
      COALESCE(SUM(wo.quantity), 0)::float8 AS product_quantity
    FROM work.order wo
    LEFT JOIN work.info ON wo.info_uuid = info.uuid
    LEFT JOIN delivery.challan_entry ce ON wo.uuid = ce.order_uuid
    LEFT JOIN delivery.challan ch ON ce.challan_uuid = ch.uuid
    WHERE
      info.is_product_received = TRUE
      AND wo.is_diagnosis_need = TRUE
      AND wo.is_proceed_to_repair = FALSE
      AND wo.is_transferred_for_qc = FALSE
      AND wo.is_ready_for_delivery = FALSE
      AND wo.is_delivery_without_challan = FALSE
      AND ch.uuid IS NULL
      AND wo.is_return = FALSE`;

  // Build conditions dynamically
  if (from_date && to_date) {
    query = sql`${query}
      AND wo.created_at BETWEEN ${from_date}::timestamp AND ${to_date}::timestamp + INTERVAL '1 day'`;
  }

  if (engineer_uuid) {
    query = sql`${query}
      AND wo.engineer_uuid = ${engineer_uuid}`;
  }

  const data = await db.execute(query);

  return c.json((data.rows && data.rows[0]) || {}, HSCode.OK);
};

export const orderDiagnosisCompleteCount: AppRouteHandler<OrderDiagnosisCompleteCountRoute> = async (c: any) => {
  const { engineer_uuid, from_date, to_date } = c.req.valid('query');

  let query = sql`
    SELECT
      COUNT(DISTINCT wo.uuid)::float8 AS order_count,
      COALESCE(SUM(wo.quantity), 0)::float8 AS product_quantity
    FROM work.order wo
    LEFT JOIN work.diagnosis ON wo.uuid = diagnosis.order_uuid
    LEFT JOIN work.info ON wo.info_uuid = info.uuid
    LEFT JOIN delivery.challan_entry ce ON wo.uuid = ce.order_uuid
    LEFT JOIN delivery.challan ch ON ce.challan_uuid = ch.uuid
    WHERE
      info.is_product_received = TRUE
      AND wo.is_diagnosis_need = TRUE
      AND diagnosis.is_diagnosis_completed = TRUE
      AND wo.is_proceed_to_repair = FALSE
      AND wo.is_transferred_for_qc = FALSE
      AND wo.is_ready_for_delivery = FALSE
      AND wo.is_delivery_without_challan = FALSE
      AND ch.uuid IS NULL
      AND wo.is_return = FALSE`;

  // Build conditions dynamically
  if (from_date && to_date) {
    query = sql`${query}
      AND wo.created_at BETWEEN ${from_date}::timestamp AND ${to_date}::timestamp + INTERVAL '1 day'`;
  }

  if (engineer_uuid) {
    query = sql`${query}
      AND wo.engineer_uuid = ${engineer_uuid}`;
  }

  const data = await db.execute(query);

  return c.json((data.rows && data.rows[0]) || {}, HSCode.OK);
};

export const repairCount: AppRouteHandler<RepairCountRoute> = async (c: any) => {
  const { engineer_uuid, from_date, to_date } = c.req.valid('query');

  // Build conditions array
  const conditions = [
    eq(orderTable.is_proceed_to_repair, true),
    eq(orderTable.is_transferred_for_qc, false),
    eq(orderTable.is_ready_for_delivery, false),
    eq(orderTable.is_delivery_without_challan, false),
    eq(orderTable.is_return, false),
  ];

  // Add date filter if provided
  if (from_date && to_date) {
    conditions.push(sql`${orderTable.created_at} BETWEEN ${from_date}::timestamp AND ${to_date}::timestamp + INTERVAL '1 day'`);
  }

  // Add engineer filter if provided
  if (engineer_uuid) {
    conditions.push(eq(orderTable.engineer_uuid, engineer_uuid));
  }

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .where(and(...conditions));

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const qcCount: AppRouteHandler<QcCountRoute> = async (c: any) => {
  const { engineer_uuid, from_date, to_date } = c.req.valid('query');

  // Build conditions array
  const conditions = [
    eq(orderTable.is_proceed_to_repair, true),
    eq(orderTable.is_transferred_for_qc, true),
    eq(orderTable.is_ready_for_delivery, false),
    eq(orderTable.is_delivery_without_challan, false),
    eq(orderTable.is_return, false),
  ];

  // Add date filter if provided
  if (from_date && to_date) {
    conditions.push(sql`${orderTable.created_at} BETWEEN ${from_date}::timestamp AND ${to_date}::timestamp + INTERVAL '1 day'`);
  }

  // Add engineer filter if provided
  if (engineer_uuid) {
    conditions.push(eq(orderTable.engineer_uuid, engineer_uuid));
  }

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .where(and(...conditions));

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const readyForDeliveryCount: AppRouteHandler<ReadyForDeliveryCountRoute> = async (c: any) => {
  const { engineer_uuid, from_date, to_date } = c.req.valid('query');

  // Build conditions array
  const conditions = [
    eq(orderTable.is_proceed_to_repair, true),
    eq(orderTable.is_ready_for_delivery, true),
    eq(orderTable.is_delivery_without_challan, false),
    sql`${challan_entry.uuid} IS NULL`,
    eq(orderTable.is_return, false),
  ];

  // Add date filter if provided
  if (from_date && to_date) {
    conditions.push(sql`${orderTable.created_at} BETWEEN ${from_date}::timestamp AND ${to_date}::timestamp + INTERVAL '1 day'`);
  }

  // Add engineer filter if provided
  if (engineer_uuid) {
    conditions.push(eq(orderTable.engineer_uuid, engineer_uuid));
  }

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(and(...conditions));

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const deliveredCount: AppRouteHandler<DeliveredCountRoute> = async (c: any) => {
  const { engineer_uuid, from_date, to_date } = c.req.valid('query');

  // Build conditions array
  const conditions = [
    eq(orderTable.is_proceed_to_repair, true),
    eq(orderTable.is_ready_for_delivery, true),
    or(
      eq(challan.is_delivery_complete, true),
      eq(orderTable.is_delivery_without_challan, true),
    ),
    eq(orderTable.is_return, false),
  ];

  // Add date filter if provided
  if (from_date && to_date) {
    conditions.push(sql`${orderTable.created_at} BETWEEN ${from_date}::timestamp AND ${to_date}::timestamp + INTERVAL '1 day'`);
  }

  // Add engineer filter if provided
  if (engineer_uuid) {
    conditions.push(eq(orderTable.engineer_uuid, engineer_uuid));
  }

  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(orderTable)
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(and(...conditions));

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const dashboardReport: AppRouteHandler<DashboardReportRoute> = async (c: any) => {
  const { engineer_uuid } = c.req.valid('query');

  const api = createApi(c);
  const [
    receivedCount,
    diagnosisCount,
    diagnosisCompleteCount,
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
      ? api.get(`/v1/work/dashboard/order-diagnosis-complete-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/order-diagnosis-complete-count').then(res => res.data),
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
    diagnosisComplete: diagnosisCompleteCount,
    repair: repairCountResult,
    qc: qcCountResult,
    readyForDelivery: readyForDeliveryCountResult,
    delivered: deliveredCountResult,
  });
};

// * Dashboard All

export const dashboardAllReport: AppRouteHandler<DashboardAllReportRoute> = async (c: any) => {
  const { engineer_uuid, date } = c.req.valid('query');

  // 3 day range from date, where date is to_date
  const from_date_prev_3_day = date ? new Date(date) : null;
  const to_date_now = date ? new Date(date) : null;
  if (from_date_prev_3_day) {
    from_date_prev_3_day.setDate(from_date_prev_3_day.getDate() - 3);
  }

  // 7 day range from date, where date is to_date
  const from_date_prev_7_day = date ? new Date(date) : null;
  if (from_date_prev_7_day) {
    from_date_prev_7_day.setDate(from_date_prev_7_day.getDate() - 7);
  }

  // 14 day range from date, where date is to_date
  const from_date_prev_14_day = date ? new Date(date) : null;
  if (from_date_prev_14_day) {
    from_date_prev_14_day.setDate(from_date_prev_14_day.getDate() - 14);
  }

  // 30 day range from date, where date is to_date
  const from_date_prev_30_day = date ? new Date(date) : null;
  if (from_date_prev_30_day) {
    from_date_prev_30_day.setDate(from_date_prev_30_day.getDate() - 30);
  }

  // fix the date format to YYYY-MM-DD
  const formatDate = (d: Date | null) => {
    if (!d)
      return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const from_date_3_day = formatDate(from_date_prev_3_day);
  const to_date = formatDate(to_date_now);
  const from_date_7_day = formatDate(from_date_prev_7_day);
  const from_date_14_day = formatDate(from_date_prev_14_day);
  const from_date_30_day = formatDate(from_date_prev_30_day);

  const api = createApi(c);

  const [
    receivedCount_3_day,
    diagnosisCount_3_day,
    diagnosisCompleteCount_3_day,
    repairCountResult_3_day,
    qcCountResult_3_day,
    readyForDeliveryCountResult_3_day,
    deliveredCountResult_3_day,
  ] = await Promise.all([
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-and-product-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-and-product-count?from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-count?from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-complete-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-complete-count?from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/repair-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/repair-count?from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/qc-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/qc-count?from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/ready-for-delivery-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/ready-for-delivery-count?from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/delivered-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/delivered-count?from_date=${from_date_3_day}&to_date=${to_date}`).then(res => res.data),
  ]);

  const [
    receivedCount_7_day,
    diagnosisCount_7_day,
    diagnosisCompleteCount_7_day,
    repairCountResult_7_day,
    qcCountResult_7_day,
    readyForDeliveryCountResult_7_day,
    deliveredCountResult_7_day,
  ] = await Promise.all([
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-and-product-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-and-product-count?from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-count?from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-complete-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-complete-count?from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/repair-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/repair-count?from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/qc-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/qc-count?from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/ready-for-delivery-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/ready-for-delivery-count?from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/delivered-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/delivered-count?from_date=${from_date_7_day}&to_date=${from_date_3_day}`).then(res => res.data),
  ]);

  const [
    receivedCount_14_day,
    diagnosisCount_14_day,
    diagnosisCompleteCount_14_day,
    repairCountResult_14_day,
    qcCountResult_14_day,
    readyForDeliveryCountResult_14_day,
    deliveredCountResult_14_day,
  ] = await Promise.all([
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-and-product-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-and-product-count?from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-count?from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-complete-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-complete-count?from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/repair-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/repair-count?from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/qc-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/qc-count?from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/ready-for-delivery-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/ready-for-delivery-count?from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/delivered-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/delivered-count?from_date=${from_date_14_day}&to_date=${from_date_7_day}`).then(res => res.data),
  ]);

  const [
    receivedCount_30_day,
    diagnosisCount_30_day,
    diagnosisCompleteCount_30_day,
    repairCountResult_30_day,
    qcCountResult_30_day,
    readyForDeliveryCountResult_30_day,
    deliveredCountResult_30_day,
  ] = await Promise.all([
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-and-product-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-and-product-count?from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-count?from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-complete-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/order-diagnosis-complete-count?from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/repair-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/repair-count?from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/qc-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/qc-count?from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/ready-for-delivery-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/ready-for-delivery-count?from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/delivered-count?engineer_uuid=${engineer_uuid}&from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data)
      : api.get(`/v1/work/dashboard/delivered-count?from_date=${from_date_30_day}&to_date=${from_date_14_day}`).then(res => res.data),
  ]);

  const [
    receivedCount_all,
    diagnosisCount_all,
    diagnosisCompleteCount_all,
    repairCountResult_all,
    qcCountResult_all,
    readyForDeliveryCountResult_all,
    deliveredCountResult_all,
  ] = await Promise.all([
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-and-product-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/order-and-product-count').then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/order-diagnosis-count').then(res => res.data),
    engineer_uuid
      ? api.get(`/v1/work/dashboard/order-diagnosis-complete-count?engineer_uuid=${engineer_uuid}`).then(res => res.data)
      : api.get('/v1/work/dashboard/order-diagnosis-complete-count').then(res => res.data),
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
    received_3_day: receivedCount_3_day,
    diagnosis_3_day: diagnosisCount_3_day,
    diagnosisComplete_3_day: diagnosisCompleteCount_3_day,
    repair_3_day: repairCountResult_3_day,
    qc_3_day: qcCountResult_3_day,
    readyForDelivery_3_day: readyForDeliveryCountResult_3_day,
    delivered_3_day: deliveredCountResult_3_day,

    received_7_day: receivedCount_7_day,
    diagnosis_7_day: diagnosisCount_7_day,
    diagnosisComplete_7_day: diagnosisCompleteCount_7_day,
    repair_7_day: repairCountResult_7_day,
    qc_7_day: qcCountResult_7_day,
    readyForDelivery_7_day: readyForDeliveryCountResult_7_day,
    delivered_7_day: deliveredCountResult_7_day,

    received_14_day: receivedCount_14_day,
    diagnosis_14_day: diagnosisCount_14_day,
    diagnosisComplete_14_day: diagnosisCompleteCount_14_day,
    repair_14_day: repairCountResult_14_day,
    qc_14_day: qcCountResult_14_day,
    readyForDelivery_14_day: readyForDeliveryCountResult_14_day,
    delivered_14_day: deliveredCountResult_14_day,

    received_30_day: receivedCount_30_day,
    diagnosis_30_day: diagnosisCount_30_day,
    diagnosisComplete_30_day: diagnosisCompleteCount_30_day,
    repair_30_day: repairCountResult_30_day,
    qc_30_day: qcCountResult_30_day,
    readyForDelivery_30_day: readyForDeliveryCountResult_30_day,
    delivered_30_day: deliveredCountResult_30_day,

    received_all: receivedCount_all,
    diagnosis_all: diagnosisCount_all,
    diagnosisComplete_all: diagnosisCompleteCount_all,
    repair_all: repairCountResult_all,
    qc_all: qcCountResult_all,
    readyForDelivery_all: readyForDeliveryCountResult_all,
    delivered_all: deliveredCountResult_all,
  });
};

export const customerReceiveTypeCount: AppRouteHandler<CustomerReceiveTypeCountRoute> = async (c: any) => {
  const query = sql`
    SELECT
      COUNT(DISTINCT wo.uuid)::float8 AS order_count,
      SUM(CASE WHEN info.receive_type = 'customer_drop_off' THEN 1 ELSE 0 END)::float8 AS customer_drop_off_count,
      SUM(CASE WHEN info.receive_type = 'home_received' THEN 1 ELSE 0 END)::float8 AS home_received_count,
      SUM(CASE WHEN info.receive_type = 'courier_received' THEN 1 ELSE 0 END)::float8 AS courier_received_count
    FROM work.order wo
    LEFT JOIN work.info ON wo.info_uuid = info.uuid
    LEFT JOIN delivery.challan_entry ce ON wo.uuid = ce.order_uuid
    LEFT JOIN delivery.challan ch ON ce.challan_uuid = ch.uuid
    WHERE
    wo.is_return = TRUE OR (wo.is_ready_for_delivery = TRUE AND wo.bill_amount > 0)`;

  const data = await db.execute(query);

  return c.json((data.rows && data.rows[0]) || {}, HSCode.OK);
};
