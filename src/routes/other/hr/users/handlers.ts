import type { AppRouteHandler } from '@/lib/types';

import { and, eq, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import * as deliverySchema from '@/routes/delivery/schema';
import * as hrSchema from '@/routes/hr/schema';
import * as workSchema from '@/routes/work/schema';

import type { UserAccessRoute, ValueLabelRoute } from './routes';

const engineerWorkInfo = alias(workSchema.info, 'engineerInfo');
const engineerOrder = alias(workSchema.order, 'engineerOrder');
const engineerDeliveryChallanEntry = alias(deliverySchema.challan_entry, 'engineerChallanEntry');
const engineerDeliveryChallan = alias(deliverySchema.challan, 'engineerChallan');

const receivedTrue = sql`CASE WHEN 
      ${engineerWorkInfo.is_product_received} = TRUE
      AND ${engineerOrder.is_diagnosis_need} = FALSE
      AND ${engineerOrder.is_proceed_to_repair} = FALSE
      AND ${engineerOrder.is_transferred_for_qc} = FALSE
      AND ${engineerOrder.is_ready_for_delivery} = FALSE
      AND ${engineerOrder.is_delivery_without_challan} = FALSE
      AND ${engineerDeliveryChallan.uuid} IS NULL
      AND ${engineerOrder.is_return} = FALSE 
      THEN ${engineerOrder.quantity} END`;
const diagnosisTrue = sql`CASE WHEN 
      ${engineerWorkInfo.is_product_received} = TRUE 
      AND ${engineerOrder.is_diagnosis_need} = TRUE 
      AND ${engineerOrder.is_proceed_to_repair} = FALSE
      AND ${engineerOrder.is_transferred_for_qc} = FALSE
      AND ${engineerOrder.is_ready_for_delivery} = FALSE
      AND ${engineerOrder.is_delivery_without_challan} = FALSE
      AND ${engineerDeliveryChallan.uuid} IS NULL
      AND ${engineerOrder.is_return} = FALSE 
      THEN ${engineerOrder.quantity} END`;
const repairTrue = sql`CASE WHEN 
      ${engineerOrder.is_proceed_to_repair} = TRUE 
      AND ${engineerOrder.is_transferred_for_qc} = FALSE 
      AND ${engineerOrder.is_ready_for_delivery} = FALSE
      AND ${engineerOrder.is_delivery_without_challan} = FALSE
      AND ${engineerDeliveryChallan.uuid} IS NULL
      AND ${engineerOrder.is_return} = FALSE 
      THEN ${engineerOrder.quantity} END`;

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const {
    type,
    designation,
    department,
    is_ready_for_delivery,
    is_delivery_complete,
    challan_uuid,
    filteredUser,
    user_uuid,
    is_challan_needed,
  } = c.req.valid('query');

  const filters = [];

  if (filteredUser === 'true') {
    filters.push(
      and(
        eq(sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT))`, 'employee'),
        sql`${hrSchema.employee.user_uuid} IS NULL`,
      ),
    );
  }

  if (type === 'customer' || type === 'web') {
    filters.push(sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT)) IN ('customer', 'web')`);
  }
  else if (type) {
    filters.push(eq(sql`LOWER(CAST(${hrSchema.users.user_type} AS TEXT))`, type.toLowerCase()));
  }

  if (department) {
    filters.push(eq(sql`LOWER(${hrSchema.department.department})`, department.toLowerCase()));
  }

  if (designation) {
    filters.push(eq(sql`LOWER(${hrSchema.designation.designation})`, designation.toLowerCase()));
  }

  if (is_ready_for_delivery && is_delivery_complete) {
    filters.push(
      or(
        eq(workSchema.order.is_ready_for_delivery, is_ready_for_delivery),
        eq(deliverySchema.challan.is_delivery_complete, is_delivery_complete),
      ),
    );
  }

  if (is_challan_needed === 'true') {
    filters.push(
      and(
        or(
          eq(workSchema.order.is_ready_for_delivery, true),
          eq(workSchema.order.is_challan_needed, true),
        ),
        or(
          eq(deliverySchema.challan.is_delivery_complete, false),
          sql`${deliverySchema.challan.customer_uuid} IS NULL`,
        ),
      ),
    );
  }

  if (challan_uuid) {
    filters.push(eq(deliverySchema.challan.uuid, challan_uuid));
  }

  if (user_uuid) {
    filters.push(eq(hrSchema.users.uuid, user_uuid));
  }

  let data;

  if (department === 'engineer') {
    // Engineer-specific query with work counts
    const engineerQuery = db
      .select({
        value: hrSchema.users.uuid,
        label: sql`CONCAT(${hrSchema.users.name}, 
            ' (', 'WIH: ', (SUM(${receivedTrue})::float8 + SUM(${diagnosisTrue})::float8 + SUM(${repairTrue})::float8), ')')`,
        received_count: sql`SUM(${receivedTrue})::float8`,
        diagnosis_count: sql`SUM(${diagnosisTrue})::float8`,
        repair_count: sql`SUM(${repairTrue})::float8`,
      })
      .from(hrSchema.users)
      .leftJoin(hrSchema.designation, eq(hrSchema.users.designation_uuid, hrSchema.designation.uuid))
      .leftJoin(hrSchema.department, eq(hrSchema.users.department_uuid, hrSchema.department.uuid))
      .leftJoin(engineerOrder, eq(engineerOrder.engineer_uuid, hrSchema.users.uuid))
      .leftJoin(engineerWorkInfo, eq(engineerWorkInfo.uuid, engineerOrder.info_uuid))
      .leftJoin(engineerDeliveryChallanEntry, eq(engineerDeliveryChallanEntry.order_uuid, engineerOrder.uuid))
      .leftJoin(engineerDeliveryChallan, eq(engineerDeliveryChallanEntry.challan_uuid, engineerDeliveryChallan.uuid))
      .leftJoin(hrSchema.employee, eq(hrSchema.users.uuid, hrSchema.employee.user_uuid))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .groupBy(
        hrSchema.users.uuid,
        hrSchema.users.name,
        hrSchema.users.phone,
      );

    data = await engineerQuery;
  }
  else {
    // Regular query for non-engineer users
    const regularQuery = db
      .select({
        value: hrSchema.users.uuid,
        label:
          type === 'customer' || type === 'web'
            ? sql`CONCAT(${hrSchema.users.name}, ' - ', ${hrSchema.users.phone})`
            : hrSchema.users.name,
        ...((type === 'customer' || type === 'web') && {
          zone_uuid: sql`MAX(${workSchema.info.zone_uuid})`,
          zone_name: sql`MAX(${workSchema.zone.name})`,
          location: sql`MAX(${workSchema.info.location})`,
          user_type: sql`MAX(${hrSchema.users.user_type})`,
        }),
      })
      .from(hrSchema.users)
      .leftJoin(hrSchema.designation, eq(hrSchema.users.designation_uuid, hrSchema.designation.uuid))
      .leftJoin(hrSchema.department, eq(hrSchema.users.department_uuid, hrSchema.department.uuid))
      .leftJoin(workSchema.info, eq(hrSchema.users.uuid, workSchema.info.user_uuid))
      .leftJoin(workSchema.order, eq(workSchema.info.uuid, workSchema.order.info_uuid))
      .leftJoin(workSchema.zone, eq(workSchema.info.zone_uuid, workSchema.zone.uuid))
      .leftJoin(deliverySchema.challan, eq(hrSchema.users.uuid, deliverySchema.challan.customer_uuid))
      .leftJoin(hrSchema.employee, eq(hrSchema.users.uuid, hrSchema.employee.user_uuid))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .groupBy(
        hrSchema.users.uuid,
        hrSchema.users.name,
        hrSchema.users.phone,
      );

    data = await regularQuery;
  }

  return c.json(data, HSCode.OK);
};

export const userAccess: AppRouteHandler<UserAccessRoute> = async (c: any) => {
  const userPromise = db
    .select({
      value: hrSchema.users.uuid,
      label: hrSchema.users.name,
      can_access: hrSchema.users.can_access,
    })
    .from(hrSchema.users);

  const data = await userPromise;

  return c.json(data, HSCode.OK);
};
