import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { branch } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(branch).values(value).returning({
    name: branch.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(branch)
    .set(updates)
    .where(eq(branch.uuid, uuid))
    .returning({
      name: branch.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(branch)
    .where(eq(branch.uuid, uuid))
    .returning({
      name: branch.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: branch.uuid,
    name: branch.name,
    address: branch.address,
    created_by: branch.created_by,
    created_by_name: users.name,
    created_at: branch.created_at,
    updated_at: branch.updated_at,
    remarks: branch.remarks,
  })
    .from(branch)
    .leftJoin(users, eq(branch.created_by, users.uuid))
    .orderBy(desc(branch.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: branch.uuid,
    name: branch.name,
    address: branch.address,
    created_by: branch.created_by,
    created_by_name: users.name,
    created_at: branch.created_at,
    updated_at: branch.updated_at,
    remarks: branch.remarks,
  })
    .from(branch)
    .leftJoin(users, eq(branch.created_by, users.uuid))
    .where(eq(branch.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
