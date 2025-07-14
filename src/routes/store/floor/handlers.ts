import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { floor, rack } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(floor).values(value).returning({
    name: floor.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(floor)
    .set(updates)
    .where(eq(floor.uuid, uuid))
    .returning({
      name: floor.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(floor)
    .where(eq(floor.uuid, uuid))
    .returning({
      name: floor.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: floor.uuid,
    name: floor.name,
    rack_uuid: floor.rack_uuid,
    rack_name: rack.name,
    created_by: floor.created_by,
    created_by_name: users.name,
    created_at: floor.created_at,
    updated_at: floor.updated_at,
    remarks: floor.remarks,
  })
    .from(floor)
    .leftJoin(users, eq(floor.created_by, users.uuid))
    .leftJoin(rack, eq(floor.rack_uuid, rack.uuid))
    .orderBy(desc(floor.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: floor.uuid,
    name: floor.name,
    rack_uuid: floor.rack_uuid,
    rack_name: rack.name,
    created_by: floor.created_by,
    created_by_name: users.name,
    created_at: floor.created_at,
    updated_at: floor.updated_at,
    remarks: floor.remarks,
  })
    .from(floor)
    .leftJoin(users, eq(floor.created_by, users.uuid))
    .leftJoin(rack, eq(floor.rack_uuid, rack.uuid))
    .where(eq(floor.uuid, uuid));

  const [data] = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
