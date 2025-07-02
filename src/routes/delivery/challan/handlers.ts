import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { branch } from '@/routes/store/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { challan, courier, vehicle } from '../schema';

const employee_users = alias(users, 'employee_users');
const created_by_users = alias(users, 'created_by_users');
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
  const resultPromise = db.select({
    id: challan.id,
    uuid: challan.uuid,
    customer_uuid: challan.customer_uuid,
    customer_name: users.name,
    challan_type: challan.challan_type,
    employee_uuid: challan.employee_uuid,
    employee_name: employee_users.name,
    vehicle_uuid: challan.vehicle_uuid,
    vehicle_name: vehicle.name,
    courier_uuid: challan.courier_uuid,
    courier_name: courier.name,
    is_delivery_complete: challan.is_delivery_complete,
    payment_method: challan.payment_method,
    branch_uuid: challan.branch_uuid,
    branch_name: branch.name,
    created_by: challan.created_by,
    created_by_name: created_by_users.name,
    created_at: challan.created_at,
    updated_at: challan.updated_at,
    remarks: challan.remarks,
  })
    .from(challan)
    .leftJoin(users, eq(challan.customer_uuid, users.uuid))
    .leftJoin(employee_users, eq(challan.employee_uuid, employee_users.uuid))
    .leftJoin(vehicle, eq(challan.vehicle_uuid, vehicle.uuid))
    .leftJoin(courier, eq(challan.courier_uuid, courier.uuid))
    .leftJoin(branch, eq(challan.branch_uuid, branch.uuid))
    .leftJoin(created_by_users, eq(challan.created_by, created_by_users.uuid));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    id: challan.id,
    uuid: challan.uuid,
    customer_uuid: challan.customer_uuid,
    customer_name: users.name,
    challan_type: challan.challan_type,
    employee_uuid: challan.employee_uuid,
    employee_name: employee_users.name,
    vehicle_uuid: challan.vehicle_uuid,
    vehicle_name: vehicle.name,
    courier_uuid: challan.courier_uuid,
    courier_name: courier.name,
    is_delivery_complete: challan.is_delivery_complete,
    payment_method: challan.payment_method,
    branch_uuid: challan.branch_uuid,
    branch_name: branch.name,
    created_by: challan.created_by,
    created_by_name: created_by_users.name,
    created_at: challan.created_at,
    updated_at: challan.updated_at,
    remarks: challan.remarks,
  })
    .from(challan)
    .leftJoin(users, eq(challan.customer_uuid, users.uuid))
    .leftJoin(employee_users, eq(challan.employee_uuid, employee_users.uuid))
    .leftJoin(vehicle, eq(challan.vehicle_uuid, vehicle.uuid))
    .leftJoin(courier, eq(challan.courier_uuid, courier.uuid))
    .leftJoin(branch, eq(challan.branch_uuid, branch.uuid))
    .leftJoin(created_by_users, eq(challan.created_by, created_by_users.uuid))
    .where(eq(challan.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
