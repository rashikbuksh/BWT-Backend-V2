import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { order } from '@/routes/work/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, product_transfer, warehouse } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product_transfer).values(value).returning({
    name: product_transfer.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product_transfer)
    .set(updates)
    .where(eq(product_transfer.uuid, uuid))
    .returning({
      name: product_transfer.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product_transfer)
    .where(eq(product_transfer.uuid, uuid))
    .returning({
      name: product_transfer.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: product_transfer.uuid,
    id: product_transfer.id,
    product_uuid: product_transfer.product_uuid,
    product_name: product.name,
    warehouse_uuid: product_transfer.warehouse_uuid,
    warehouse_name: warehouse.name,
    order_uuid: product_transfer.order_uuid,
    order_id: order.id,
    quantity: product_transfer.quantity,
    created_by: product_transfer.created_by,
    created_by_name: users.name,
    created_at: product_transfer.created_at,
    updated_at: product_transfer.updated_at,
    remarks: product_transfer.remarks,
  })
    .from(product_transfer)
    .leftJoin(users, eq(product_transfer.created_by, users.uuid))
    .leftJoin(product, eq(product_transfer.product_uuid, product.uuid))
    .leftJoin(warehouse, eq(product_transfer.warehouse_uuid, warehouse.uuid))
    .leftJoin(order, eq(product_transfer.order_uuid, order.uuid))
    .orderBy(desc(product_transfer.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product_transfer.uuid,
    id: product_transfer.id,
    product_uuid: product_transfer.product_uuid,
    product_name: product.name,
    warehouse_uuid: product_transfer.warehouse_uuid,
    warehouse_name: warehouse.name,
    order_uuid: product_transfer.order_uuid,
    order_id: order.id,
    quantity: product_transfer.quantity,
    created_by: product_transfer.created_by,
    created_by_name: users.name,
    created_at: product_transfer.created_at,
    updated_at: product_transfer.updated_at,
    remarks: product_transfer.remarks,
  })
    .from(product_transfer)
    .leftJoin(users, eq(product_transfer.created_by, users.uuid))
    .leftJoin(product, eq(product_transfer.product_uuid, product.uuid))
    .leftJoin(warehouse, eq(product_transfer.warehouse_uuid, warehouse.uuid))
    .leftJoin(order, eq(product_transfer.order_uuid, order.uuid))
    .where(eq(product_transfer.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
