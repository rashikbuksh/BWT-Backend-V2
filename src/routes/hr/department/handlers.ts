import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { department } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(department).values(value).returning({
    name: department.department,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(department)
    .set(updates)
    .where(eq(department.uuid, uuid))
    .returning({
      name: department.department,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(department)
    .where(eq(department.uuid, uuid))
    .returning({
      name: department.department,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const departmentPromise = db
    .select({
      uuid: department.uuid,
      id: department.id,
      name: department.department,
      created_at: department.created_at,
      updated_at: department.updated_at,
      hierarchy: department.hierarchy,
      status: department.status,
    })
    .from(department)
    .orderBy(desc(department.created_at));

  const data = await departmentPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const departmentPromise = db
    .select({
      uuid: department.uuid,
      id: department.id,
      name: department.department,
      created_at: department.created_at,
      updated_at: department.updated_at,
      hierarchy: department.hierarchy,
      status: department.status,
    })
    .from(department)
    .where(eq(department.uuid, uuid));

  const [data] = await departmentPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
