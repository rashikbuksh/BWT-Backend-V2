import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { accessory } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(accessory).values(value).returning({
    name: accessory.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(accessory)
    .set(updates)
    .where(eq(accessory.uuid, uuid))
    .returning({
      name: accessory.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(accessory)
    .where(eq(accessory.uuid, uuid))
    .returning({
      name: accessory.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: accessory.uuid,
    name: accessory.name,
    created_by: accessory.created_by,
    created_by_name: users.name,
    created_at: accessory.created_at,
    updated_at: accessory.updated_at,
    remarks: accessory.remarks,
  })
    .from(accessory)
    .leftJoin(users, eq(accessory.created_by, users.uuid))
    .orderBy(desc(accessory.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: accessory.uuid,
    name: accessory.name,
    created_by: accessory.created_by,
    created_by_name: users.name,
    created_at: accessory.created_at,
    updated_at: accessory.updated_at,
    remarks: accessory.remarks,
  })
    .from(accessory)
    .leftJoin(users, eq(accessory.created_by, users.uuid))
    .where(eq(accessory.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
