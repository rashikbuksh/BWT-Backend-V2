import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { box, floor } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(box).values(value).returning({
    name: box.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(box)
    .set(updates)
    .where(eq(box.uuid, uuid))
    .returning({
      name: box.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(box)
    .where(eq(box.uuid, uuid))
    .returning({
      name: box.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: box.uuid,
    name: box.name,
    floor_uuid: box.floor_uuid,
    floor_name: floor.name,
    created_by: box.created_by,
    created_by_name: users.name,
    created_at: box.created_at,
    updated_at: box.updated_at,
    remarks: box.remarks,
  })
    .from(box)
    .leftJoin(users, eq(box.created_by, users.uuid))
    .leftJoin(floor, eq(box.floor_uuid, floor.uuid))
    .orderBy(desc(box.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: box.uuid,
    name: box.name,
    floor_uuid: box.floor_uuid,
    floor_name: floor.name,
    created_by: box.created_by,
    created_by_name: users.name,
    created_at: box.created_at,
    updated_at: box.updated_at,
    remarks: box.remarks,
  })
    .from(box)
    .leftJoin(users, eq(box.created_by, users.uuid))
    .leftJoin(floor, eq(box.floor_uuid, floor.uuid))
    .where(eq(box.uuid, uuid));

  const [data] = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
