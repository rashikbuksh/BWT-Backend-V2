import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { brand, model } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(model).values(value).returning({
    name: model.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(model)
    .set(updates)
    .where(eq(model.uuid, uuid))
    .returning({
      name: model.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(model)
    .where(eq(model.uuid, uuid))
    .returning({
      name: model.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const modelPromise = db.select({
    uuid: model.uuid,
    name: model.name,
    brand_uuid: model.brand_uuid,
    brand_name: brand.name,
    created_by: model.created_by,
    created_by_name: users.name,
    created_at: model.created_at,
    updated_at: model.updated_at,
    remarks: model.remarks,
  })
    .from(model)
    .leftJoin(users, eq(model.created_by, users.uuid))
    .leftJoin(brand, eq(model.brand_uuid, brand.uuid));

  const data = await modelPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const modelPromise = db.select({
    uuid: model.uuid,
    name: model.name,
    brand_uuid: model.brand_uuid,
    brand_name: brand.name,
    created_by: model.created_by,
    created_by_name: users.name,
    created_at: model.created_at,
    updated_at: model.updated_at,
    remarks: model.remarks,
  })
    .from(model)
    .leftJoin(users, eq(model.created_by, users.uuid))
    .leftJoin(brand, eq(model.brand_uuid, brand.uuid))
    .where(eq(model.uuid, uuid));

  const [data] = await modelPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
