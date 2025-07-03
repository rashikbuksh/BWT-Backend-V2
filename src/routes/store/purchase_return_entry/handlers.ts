import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, purchase_return, purchase_return_entry } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(purchase_return_entry).values(value).returning({
    name: purchase_return_entry.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(purchase_return_entry)
    .set(updates)
    .where(eq(purchase_return_entry.uuid, uuid))
    .returning({
      name: purchase_return_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(purchase_return_entry)
    .where(eq(purchase_return_entry.uuid, uuid))
    .returning({
      name: purchase_return_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: purchase_return_entry.uuid,
    purchase_return_uuid: purchase_return_entry.purchase_return_uuid,
    purchase_return_id: purchase_return.id,
    product_uuid: purchase_return_entry.product_uuid,
    product_name: product.name,
    quantity: purchase_return_entry.quantity,
    price_per_unit: purchase_return_entry.price_per_unit,
    created_by: purchase_return_entry.created_by,
    created_by_name: users.name,
    created_at: purchase_return_entry.created_at,
    updated_at: purchase_return_entry.updated_at,
    remarks: purchase_return_entry.remarks,
  })
    .from(purchase_return_entry)
    .leftJoin(users, eq(purchase_return_entry.created_by, users.uuid))
    .leftJoin(purchase_return, eq(purchase_return_entry.purchase_return_uuid, purchase_return.uuid))
    .leftJoin(product, eq(purchase_return_entry.product_uuid, product.uuid))
    .orderBy(desc(purchase_return_entry.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: purchase_return_entry.uuid,
    purchase_return_uuid: purchase_return_entry.purchase_return_uuid,
    purchase_return_id: purchase_return.id,
    product_uuid: purchase_return_entry.product_uuid,
    product_name: product.name,
    quantity: purchase_return_entry.quantity,
    price_per_unit: purchase_return_entry.price_per_unit,
    created_by: purchase_return_entry.created_by,
    created_by_name: users.name,
    created_at: purchase_return_entry.created_at,
    updated_at: purchase_return_entry.updated_at,
    remarks: purchase_return_entry.remarks,
  })
    .from(purchase_return_entry)
    .leftJoin(users, eq(purchase_return_entry.created_by, users.uuid))
    .leftJoin(purchase_return, eq(purchase_return_entry.purchase_return_uuid, purchase_return.uuid))
    .leftJoin(product, eq(purchase_return_entry.product_uuid, product.uuid))
    .where(eq(purchase_return_entry.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
