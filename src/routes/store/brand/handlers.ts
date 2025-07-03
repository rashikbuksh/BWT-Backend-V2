import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { brand } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(brand).values(value).returning({
    name: brand.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(brand)
    .set(updates)
    .where(eq(brand.uuid, uuid))
    .returning({
      name: brand.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(brand)
    .where(eq(brand.uuid, uuid))
    .returning({
      name: brand.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: brand.uuid,
    id: brand.id,
    name: brand.name,
    created_by: brand.created_by,
    created_by_name: users.name,
    created_at: brand.created_at,
    updated_at: brand.updated_at,
    remarks: brand.remarks,
  })
    .from(brand)
    .leftJoin(users, eq(brand.created_by, users.uuid));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: brand.uuid,
    id: brand.id,
    name: brand.name,
    created_by: brand.created_by,
    created_by_name: users.name,
    created_at: brand.created_at,
    updated_at: brand.updated_at,
    remarks: brand.remarks,
  })
    .from(brand)
    .leftJoin(users, eq(brand.created_by, users.uuid))
    .where(eq(brand.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
