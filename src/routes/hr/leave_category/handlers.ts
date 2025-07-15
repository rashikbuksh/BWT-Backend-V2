import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { leave_category, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(leave_category).values(value).returning({
    name: leave_category.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(leave_category)
    .set(updates)
    .where(eq(leave_category.uuid, uuid))
    .returning({
      name: leave_category.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(leave_category)
    .where(eq(leave_category.uuid, uuid))
    .returning({
      name: leave_category.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const leaveCategoryPromise = db
    .select({
      uuid: leave_category.uuid,
      id: leave_category.id,
      name: leave_category.name,
      created_by: leave_category.created_by,
      created_by_name: users.name,
      created_at: leave_category.created_at,
      updated_at: leave_category.updated_at,
      remarks: leave_category.remarks,
    })
    .from(leave_category)
    .leftJoin(users, eq(leave_category.created_by, users.uuid))
    .orderBy(desc(leave_category.created_at));

  const data = await leaveCategoryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const leaveCategoryPromise = db
    .select({
      uuid: leave_category.uuid,
      id: leave_category.id,
      name: leave_category.name,
      created_by: leave_category.created_by,
      created_by_name: users.name,
      created_at: leave_category.created_at,
      updated_at: leave_category.updated_at,
      remarks: leave_category.remarks,
    })
    .from(leave_category)
    .leftJoin(users, eq(leave_category.created_by, users.uuid))
    .where(eq(leave_category.uuid, uuid));

  const [data] = await leaveCategoryPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
