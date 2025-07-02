import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { vehicle } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(vehicle).values(value).returning({
    name: vehicle.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(vehicle)
    .set(updates)
    .where(eq(vehicle.uuid, uuid))
    .returning({
      name: vehicle.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(vehicle)
    .where(eq(vehicle.uuid, uuid))
    .returning({
      name: vehicle.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: vehicle.uuid,
    name: vehicle.name,
    no: vehicle.no,
    created_by: vehicle.created_by,
    created_by_name: users.name,
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
    remarks: vehicle.remarks,
  })
    .from(vehicle)
    .leftJoin(users, eq(vehicle.created_by, users.uuid));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: vehicle.uuid,
    name: vehicle.name,
    no: vehicle.no,
    created_by: vehicle.created_by,
    created_by_name: users.name,
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
    remarks: vehicle.remarks,
  })
    .from(vehicle)
    .leftJoin(users, eq(vehicle.created_by, users.uuid))
    .where(eq(vehicle.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
