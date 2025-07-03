import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { category, model, product, size } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product).values(value).returning({
    name: product.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product)
    .set(updates)
    .where(eq(product.uuid, uuid))
    .returning({
      name: product.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product)
    .where(eq(product.uuid, uuid))
    .returning({
      name: product.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: product.uuid,
    category_uuid: product.category_uuid,
    category_name: category.name,
    model_uuid: product.model_uuid,
    model_name: model.name,
    size_uuid: product.size_uuid,
    size_name: size.name,
    name: product.name,
    warranty_days: product.warranty_days,
    service_warranty_days: product.service_warranty_days,
    type: product.type,
    is_maintaining_stock: product.is_maintaining_stock,
    created_by: product.created_by,
    created_by_name: users.name,
    created_at: product.created_at,
    updated_at: product.updated_at,
    remarks: product.remarks,
    warehouse_1: product.warehouse_1,
    warehouse_2: product.warehouse_2,
    warehouse_3: product.warehouse_3,
    warehouse_4: product.warehouse_4,
    warehouse_5: product.warehouse_5,
    warehouse_6: product.warehouse_6,
    warehouse_7: product.warehouse_7,
    warehouse_8: product.warehouse_8,
    warehouse_9: product.warehouse_9,
    warehouse_10: product.warehouse_10,
    warehouse_11: product.warehouse_11,
    warehouse_12: product.warehouse_12,
  })
    .from(product)
    .leftJoin(users, eq(product.created_by, users.uuid))
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(size, eq(product.size_uuid, size.uuid))
    .orderBy(desc(product.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product.uuid,
    category_uuid: product.category_uuid,
    category_name: category.name,
    model_uuid: product.model_uuid,
    model_name: model.name,
    size_uuid: product.size_uuid,
    size_name: size.name,
    name: product.name,
    warranty_days: product.warranty_days,
    service_warranty_days: product.service_warranty_days,
    type: product.type,
    is_maintaining_stock: product.is_maintaining_stock,
    created_by: product.created_by,
    created_by_name: users.name,
    created_at: product.created_at,
    updated_at: product.updated_at,
    remarks: product.remarks,
    warehouse_1: product.warehouse_1,
    warehouse_2: product.warehouse_2,
    warehouse_3: product.warehouse_3,
    warehouse_4: product.warehouse_4,
    warehouse_5: product.warehouse_5,
    warehouse_6: product.warehouse_6,
    warehouse_7: product.warehouse_7,
    warehouse_8: product.warehouse_8,
    warehouse_9: product.warehouse_9,
    warehouse_10: product.warehouse_10,
    warehouse_11: product.warehouse_11,
    warehouse_12: product.warehouse_12,
  })
    .from(product)
    .leftJoin(users, eq(product.created_by, users.uuid))
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(size, eq(product.size_uuid, size.uuid))
    .where(eq(product.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
