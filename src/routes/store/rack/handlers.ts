import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { rack, warehouse } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(rack).values(value).returning({
    name: rack.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(rack)
    .set(updates)
    .where(eq(rack.uuid, uuid))
    .returning({
      name: rack.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(rack)
    .where(eq(rack.uuid, uuid))
    .returning({
      name: rack.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: rack.uuid,
    warehouse_uuid: rack.warehouse_uuid,
    warehouse_name: warehouse.name,
    name: rack.name,
    created_by: rack.created_by,
    created_by_name: users.name,
    created_at: rack.created_at,
    updated_at: rack.updated_at,
    remarks: rack.remarks,
  })
    .from(rack)
    .leftJoin(users, eq(rack.created_by, users.uuid))
    .leftJoin(warehouse, eq(rack.warehouse_uuid, warehouse.uuid))
    .orderBy(desc(rack.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: rack.uuid,
    warehouse_uuid: rack.warehouse_uuid,
    warehouse_name: warehouse.name,
    name: rack.name,
    created_by: rack.created_by,
    created_by_name: users.name,
    created_at: rack.created_at,
    updated_at: rack.updated_at,
    remarks: rack.remarks,
  })
    .from(rack)
    .leftJoin(users, eq(rack.created_by, users.uuid))
    .leftJoin(warehouse, eq(rack.warehouse_uuid, warehouse.uuid))
    .where(eq(rack.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
