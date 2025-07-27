import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import * as storeSchema from '@/routes/store/schema';
import * as workSchema from '@/routes/work/schema';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetChallanDetailsByChallanRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { challan, challan_entry, courier, vehicle } from '../schema';

const customerUser = alias(users, 'customerUser');
const employeeUser = alias(users, 'employeeUser');
const orderUser = alias(users, 'orderUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(challan).values(value).returning({
    name: challan.id,
  });

  return c.json(createToast('create', data.name ?? ''), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(challan)
    .set(updates)
    .where(eq(challan.uuid, uuid))
    .returning({
      name: challan.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name ?? ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(challan)
    .where(eq(challan.uuid, uuid))
    .returning({
      name: challan.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name ?? ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const challanPromise = db
    .select({
      id: challan.id,
      challan_no: sql`CONCAT('CH', TO_CHAR(${challan.created_at}::timestamp, 'YY'), '-', TO_CHAR(${challan.id}, 'FM0000'))`,
      uuid: challan.uuid,
      customer_uuid: challan.customer_uuid,
      customer_name: customerUser.name,
      customer_phone: customerUser.phone,
      challan_type: challan.challan_type,
      employee_uuid: challan.employee_uuid,
      employee_name: employeeUser.name,
      vehicle_uuid: challan.vehicle_uuid,
      vehicle_name: vehicle.name,
      vehicle_no: vehicle.no,
      courier_uuid: challan.courier_uuid,
      courier_name: courier.name,
      courier_branch: courier.branch,
      is_delivery_complete: challan.is_delivery_complete,
      created_by: challan.created_by,
      created_by_name: users.name,
      created_at: challan.created_at,
      updated_at: challan.updated_at,
      remarks: challan.remarks,
      payment_method: challan.payment_method,
      branch_uuid: challan.branch_uuid,
      branch_name: storeSchema.branch.name,
    })
    .from(challan)
    .leftJoin(customerUser, eq(challan.customer_uuid, customerUser.uuid))
    .leftJoin(employeeUser, eq(challan.employee_uuid, employeeUser.uuid))
    .leftJoin(vehicle, eq(challan.vehicle_uuid, vehicle.uuid))
    .leftJoin(courier, eq(challan.courier_uuid, courier.uuid))
    .leftJoin(
      storeSchema.branch,
      eq(challan.branch_uuid, storeSchema.branch.uuid),
    )
    .leftJoin(users, eq(challan.created_by, users.uuid));

  const data = await challanPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const challanPromise = db
    .select({
      id: challan.id,
      challan_no: sql`CONCAT('CH', TO_CHAR(${challan.created_at}::timestamp, 'YY'), '-', TO_CHAR(${challan.id}, 'FM0000'))`,
      uuid: challan.uuid,
      customer_uuid: challan.customer_uuid,
      customer_name: customerUser.name,
      customer_phone: customerUser.phone,
      challan_type: challan.challan_type,
      employee_uuid: challan.employee_uuid,
      employee_name: employeeUser.name,
      vehicle_uuid: challan.vehicle_uuid,
      vehicle_name: vehicle.name,
      vehicle_no: vehicle.no,
      courier_uuid: challan.courier_uuid,
      courier_name: courier.name,
      courier_branch: courier.branch,
      is_delivery_complete: challan.is_delivery_complete,
      created_by: challan.created_by,
      created_by_name: users.name,
      created_at: challan.created_at,
      updated_at: challan.updated_at,
      remarks: challan.remarks,
      zone_uuid: workSchema.info.zone_uuid,
      zone_name: workSchema.zone.name,
      location: workSchema.info.location,
      order_created_by: workSchema.order.created_by,
      order_created_by_name: orderUser.name,
      payment_method: challan.payment_method,
      branch_uuid: challan.branch_uuid,
      branch_name: storeSchema.branch.name,
    })
    .from(challan)
    .leftJoin(customerUser, eq(challan.customer_uuid, customerUser.uuid))
    .leftJoin(employeeUser, eq(challan.employee_uuid, employeeUser.uuid))
    .leftJoin(vehicle, eq(challan.vehicle_uuid, vehicle.uuid))
    .leftJoin(courier, eq(challan.courier_uuid, courier.uuid))
    .leftJoin(users, eq(challan.created_by, users.uuid))
    .leftJoin(challan_entry, eq(challan.uuid, challan_entry.challan_uuid))
    .leftJoin(
      workSchema.order,
      eq(challan_entry.order_uuid, workSchema.order.uuid),
    )
    .leftJoin(orderUser, eq(workSchema.order.created_by, orderUser.uuid))
    .leftJoin(
      workSchema.info,
      eq(workSchema.order.info_uuid, workSchema.info.uuid),
    )
    .leftJoin(
      workSchema.zone,
      eq(workSchema.info.zone_uuid, workSchema.zone.uuid),
    )
    .leftJoin(
      storeSchema.branch,
      eq(challan.branch_uuid, storeSchema.branch.uuid),
    )
    .where(eq(challan.uuid, uuid));

  const [data] = await challanPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getChallanDetailsByChallan: AppRouteHandler<GetChallanDetailsByChallanRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [challan, challan_entries] = await Promise.all([
    fetchData(`/v1/delivery/challan/${uuid}`),
    fetchData(`/v1/delivery/challan-entry/by/challan/${uuid}`),
  ]);

  const response = {
    ...(challan?.data || challan || {}),
    challan_entries: challan_entries?.data || challan_entries || [],
  };

  // if (!response)
  //   return DataNotFound(c);

  return c.json(response || {}, HSCode.OK);
};
