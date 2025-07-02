import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { challan_entry } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(challan_entry).values(value).returning({
    name: challan_entry.challan_uuid,
  });

  return c.json(createToast('create', data.name ?? ''), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(challan_entry)
    .set(updates)
    .where(eq(challan_entry.uuid, uuid))
    .returning({
      name: challan_entry.challan_uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name ?? ''), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(challan_entry)
    .where(eq(challan_entry.uuid, uuid))
    .returning({
      name: challan_entry.challan_uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name ?? ''), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: challan_entry.uuid,
    challan_uuid: challan_entry.challan_uuid,
    order_uuid: challan_entry.order_uuid,
    created_by: challan_entry.created_by,
    created_by_name: users.name,
    created_at: challan_entry.created_at,
    updated_at: challan_entry.updated_at,
    remarks: challan_entry.remarks,
  })
    .from(challan_entry)
    .leftJoin(users, eq(challan_entry.created_by, users.uuid));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: challan_entry.uuid,
    challan_uuid: challan_entry.challan_uuid,
    order_uuid: challan_entry.order_uuid,
    created_by: challan_entry.created_by,
    created_by_name: users.name,
    created_at: challan_entry.created_at,
    updated_at: challan_entry.updated_at,
    remarks: challan_entry.remarks,
  })
    .from(challan_entry)
    .leftJoin(users, eq(challan_entry.created_by, users.uuid))
    .where(eq(challan_entry.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
