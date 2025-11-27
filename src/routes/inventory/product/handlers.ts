import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { brand, model } from '@/routes/store/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { category, product } from '../schema';

const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product).values(value).returning({
    name: product.title,
  });

  return c.json(createToast('create', data.name || ''), HSCode.OK);
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
      name: product.title,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name || ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product)
    .where(eq(product.uuid, uuid))
    .returning({
      name: product.title,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name || ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: product.uuid,
    title: product.title,
    category_uuid: product.category_uuid,
    category_name: category.name,
    model_uuid: product.model_uuid,
    model_name: model.name,
    brand_uuid: brand.uuid,
    brand_name: brand.name,
    created_by: product.created_by,
    created_by_name: users.name,
    updated_by: product.updated_by,
    updated_by_name: updatedByUser.name,
    created_at: product.created_at,
    updated_at: product.updated_at,
    remarks: product.remarks,
  })
    .from(product)
    .leftJoin(users, eq(product.created_by, users.uuid))
    .leftJoin(updatedByUser, eq(product.updated_by, updatedByUser.uuid))
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(brand, eq(model.brand_uuid, brand.uuid))
    .orderBy(desc(product.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product.uuid,
    title: product.title,
    category_uuid: product.category_uuid,
    category_name: category.name,
    model_uuid: product.model_uuid,
    model_name: model.name,
    brand_uuid: brand.uuid,
    brand_name: brand.name,
    created_by: product.created_by,
    created_by_name: users.name,
    updated_by: product.updated_by,
    updated_by_name: updatedByUser.name,
    created_at: product.created_at,
    updated_at: product.updated_at,
    remarks: product.remarks,
  })
    .from(product)
    .leftJoin(users, eq(product.created_by, users.uuid))
    .leftJoin(updatedByUser, eq(product.updated_by, updatedByUser.uuid))
    .leftJoin(category, eq(product.category_uuid, category.uuid))
    .leftJoin(model, eq(product.model_uuid, model.uuid))
    .leftJoin(brand, eq(model.brand_uuid, brand.uuid))
    .where(eq(product.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
