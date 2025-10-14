import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { challan, challan_entry } from '@/routes/delivery/schema';

import type { DeliveredCountRoute, OrderAndProductCountRoute, OrderDiagnosisCountRoute, QcCountRoute, ReadyForDeliveryCountRoute, RepairCountRoute } from './routes';

import { info, order } from '../schema';

const orderTable = alias(order, 'work_order');

export const orderAndProductCount: AppRouteHandler<OrderAndProductCountRoute> = async (c: any) => {
  const resultPromise = db.select({
    order_count: sql`COUNT(DISTINCT ${orderTable.info_uuid})::float8`,
    product_quantity: sql`COALESCE(SUM(${orderTable.quantity}), 0)::float8`,
  })
    .from(info)
    .leftJoin(orderTable, eq(info.uuid, orderTable.info_uuid))
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(
      and(
        eq(info.is_product_received, true),
        eq(orderTable.is_return, false),
        eq(challan.is_delivery_complete, false),
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const orderDiagnosisCount: AppRouteHandler<OrderDiagnosisCountRoute> = async (c: any) => {
  const resultPromise = db.select({
    diagnosis_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
  })
    .from(orderTable)
    .where(
      and(
        eq(orderTable.is_diagnosis_need, true),
        eq(orderTable.is_proceed_to_repair, false),
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const repairCount: AppRouteHandler<RepairCountRoute> = async (c: any) => {
  const resultPromise = db.select({
    repair_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
  })
    .from(orderTable)
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(
      and(
        eq(orderTable.is_proceed_to_repair, true),
        eq(orderTable.is_ready_for_delivery, false),
        eq(orderTable.is_transferred_for_qc, false),
        eq(orderTable.is_return, false),
        eq(challan.is_delivery_complete, false),
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const qcCount: AppRouteHandler<QcCountRoute> = async (c: any) => {
  const resultPromise = db.select({
    qc_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
  })
    .from(orderTable)
    .where(
      and(
        eq(orderTable.is_transferred_for_qc, true),
        eq(orderTable.is_ready_for_delivery, false),
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const readyForDeliveryCount: AppRouteHandler<ReadyForDeliveryCountRoute> = async (c: any) => {
  const resultPromise = db.select({
    ready_for_delivery_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
  })
    .from(orderTable)
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(
      and(
        eq(orderTable.is_ready_for_delivery, true),
        eq(challan.is_delivery_complete, false),
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};

export const deliveredCount: AppRouteHandler<DeliveredCountRoute> = async (c: any) => {
  const resultPromise = db.select({
    delivered_count: sql`COUNT(DISTINCT ${orderTable.uuid})::float8`,
  })
    .from(orderTable)
    .leftJoin(challan_entry, eq(orderTable.uuid, challan_entry.order_uuid))
    .leftJoin(challan, eq(challan_entry.challan_uuid, challan.uuid))
    .where(
      and(
        eq(challan.is_delivery_complete, true),
      ),
    );

  const data = await resultPromise;

  return c.json(data[0] || {}, HSCode.OK);
};
