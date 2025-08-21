import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product_attr } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product_attr).values(value).returning({
    name: product_attr.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product_attr)
    .set(updates)
    .where(eq(product_attr.uuid, uuid))
    .returning({
      name: product_attr.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product_attr)
    .where(eq(product_attr.uuid, uuid))
    .returning({
      name: product_attr.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: product_attr.uuid,
    name: product_attr.name,
    created_by: product_attr.created_by,
    created_by_name: users.name,
    created_at: product_attr.created_at,
    updated_at: product_attr.updated_at,
    remarks: product_attr.remarks,
  })
    .from(product_attr)
    .leftJoin(users, eq(product_attr.created_by, users.uuid))
    .orderBy(desc(product_attr.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: product_attr.uuid,
    name: product_attr.name,
    created_by: product_attr.created_by,
    created_by_name: users.name,
    created_at: product_attr.created_at,
    updated_at: product_attr.updated_at,
    remarks: product_attr.remarks,
  })
    .from(product_attr)
    .leftJoin(users, eq(product_attr.created_by, users.uuid))
    .where(eq(product_attr.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
