import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { zone } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(zone).values(value).returning({
    name: zone.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(zone)
    .set(updates)
    .where(eq(zone.uuid, uuid))
    .returning({
      name: zone.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(zone)
    .where(eq(zone.uuid, uuid))
    .returning({
      name: zone.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const zonePromise = db
    .select({
      id: zone.id,
      uuid: zone.uuid,
      name: zone.name,
      division: zone.division,
      latitude: zone.latitude,
      longitude: zone.longitude,
      created_by: zone.created_by,
      created_by_name: users.name,
      created_at: zone.created_at,
      updated_at: zone.updated_at,
      remarks: zone.remarks,
    })
    .from(zone)
    .leftJoin(users, eq(zone.created_by, users.uuid))
    .orderBy(desc(zone.created_at));

  const data = await zonePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const zonePromise = db.select({
    id: zone.id,
    uuid: zone.uuid,
    name: zone.name,
    division: zone.division,
    latitude: zone.latitude,
    longitude: zone.longitude,
    created_by: zone.created_by,
    created_by_name: users.name,
    created_at: zone.created_at,
    updated_at: zone.updated_at,
    remarks: zone.remarks,
  })
    .from(zone)
    .leftJoin(users, eq(zone.created_by, users.uuid))
    .where(eq(zone.uuid, uuid));

  const [data] = await zonePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
