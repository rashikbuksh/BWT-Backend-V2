import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { purchase, purchase_return, warehouse } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(purchase_return).values(value).returning({
    name: purchase_return.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(purchase_return)
    .set(updates)
    .where(eq(purchase_return.uuid, uuid))
    .returning({
      name: purchase_return.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(purchase_return)
    .where(eq(purchase_return.uuid, uuid))
    .returning({
      name: purchase_return.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: purchase_return.uuid,
    id: purchase_return.id,
    purchase_uuid: purchase_return.purchase_uuid,
    purchase_id: purchase.id,
    warehouse_uuid: purchase_return.warehouse_uuid,
    warehouse_name: warehouse.name,
    created_by: purchase_return.created_by,
    created_by_name: users.name,
    created_at: purchase_return.created_at,
    updated_at: purchase_return.updated_at,
    remarks: purchase_return.remarks,
  })
    .from(purchase_return)
    .leftJoin(users, eq(purchase_return.created_by, users.uuid))
    .leftJoin(purchase, eq(purchase_return.purchase_uuid, purchase.uuid))
    .leftJoin(warehouse, eq(purchase_return.warehouse_uuid, warehouse.uuid))
    .orderBy(desc(purchase_return.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: purchase_return.uuid,
    id: purchase_return.id,
    purchase_uuid: purchase_return.purchase_uuid,
    purchase_id: purchase.id,
    warehouse_uuid: purchase_return.warehouse_uuid,
    warehouse_name: warehouse.name,
    created_by: purchase_return.created_by,
    created_by_name: users.name,
    created_at: purchase_return.created_at,
    updated_at: purchase_return.updated_at,
    remarks: purchase_return.remarks,
  })
    .from(purchase_return)
    .leftJoin(users, eq(purchase_return.created_by, users.uuid))
    .leftJoin(purchase, eq(purchase_return.purchase_uuid, purchase.uuid))
    .leftJoin(warehouse, eq(purchase_return.warehouse_uuid, warehouse.uuid))
    .where(eq(purchase_return.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
