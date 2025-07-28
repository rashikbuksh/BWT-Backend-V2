import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { courier } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(courier).values(value).returning({
    name: courier.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(courier)
    .set(updates)
    .where(eq(courier.uuid, uuid))
    .returning({
      name: courier.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(courier)
    .where(eq(courier.uuid, uuid))
    .returning({
      name: courier.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const courierPromise = db
    .select({
      uuid: courier.uuid,
      name: courier.name,
      branch: courier.branch,
      created_at: courier.created_at,
      updated_at: courier.updated_at,
      remarks: courier.remarks,
      created_by: courier.created_by,
      created_by_name: users.name,
    })
    .from(courier)
    .leftJoin(users, eq(courier.created_by, users.uuid))
    .orderBy(desc(courier.created_at));

  const data = await courierPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const courierPromise = db
    .select({
      uuid: courier.uuid,
      name: courier.name,
      branch: courier.branch,
      created_at: courier.created_at,
      updated_at: courier.updated_at,
      remarks: courier.remarks,
      created_by: courier.created_by,
      created_by_name: users.name,
    })
    .from(courier)
    .leftJoin(users, eq(courier.created_by, users.uuid))
    .where(eq(courier.uuid, uuid));

  const [data] = await courierPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
