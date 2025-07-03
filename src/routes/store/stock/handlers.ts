import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, stock } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(stock).values(value).returning({
    name: stock.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(stock)
    .set(updates)
    .where(eq(stock.uuid, uuid))
    .returning({
      name: stock.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(stock)
    .where(eq(stock.uuid, uuid))
    .returning({
      name: stock.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: stock.uuid,
    id: stock.id,
    product_uuid: stock.product_uuid,
    product_name: product.name,
    warehouse_1: stock.warehouse_1,
    warehouse_2: stock.warehouse_2,
    warehouse_3: stock.warehouse_3,
    created_by: stock.created_by,
    created_by_name: users.name,
    created_at: stock.created_at,
    updated_at: stock.updated_at,
    remarks: stock.remarks,
  })
    .from(stock)
    .leftJoin(users, eq(stock.created_by, users.uuid))
    .leftJoin(product, eq(stock.product_uuid, product.uuid))
    .orderBy(desc(stock.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: stock.uuid,
    id: stock.id,
    product_uuid: stock.product_uuid,
    product_name: product.name,
    warehouse_1: stock.warehouse_1,
    warehouse_2: stock.warehouse_2,
    warehouse_3: stock.warehouse_3,
    created_by: stock.created_by,
    created_by_name: users.name,
    created_at: stock.created_at,
    updated_at: stock.updated_at,
    remarks: stock.remarks,
  })
    .from(stock)
    .leftJoin(users, eq(stock.created_by, users.uuid))
    .leftJoin(product, eq(stock.product_uuid, product.uuid))
    .where(eq(stock.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
