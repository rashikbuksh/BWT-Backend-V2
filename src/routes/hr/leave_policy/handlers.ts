import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { leave_policy, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(leave_policy).values(value).returning({
    name: leave_policy.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(leave_policy)
    .set(updates)
    .where(eq(leave_policy.uuid, uuid))
    .returning({
      name: leave_policy.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(leave_policy)
    .where(eq(leave_policy.uuid, uuid))
    .returning({
      name: leave_policy.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const leavePolicyPromise = db
    .select({
      uuid: leave_policy.uuid,
      id: leave_policy.id,
      name: leave_policy.name,
      created_by: leave_policy.created_by,
      created_by_name: users.name,
      created_at: leave_policy.created_at,
      updated_at: leave_policy.updated_at,
      remarks: leave_policy.remarks,
      is_default: leave_policy.is_default,
    })
    .from(leave_policy)
    .leftJoin(users, eq(leave_policy.created_by, users.uuid))
    .orderBy(desc(leave_policy.created_at));

  const data = await leavePolicyPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const leavePolicyPromise = db
    .select({
      uuid: leave_policy.uuid,
      id: leave_policy.id,
      name: leave_policy.name,
      created_by: leave_policy.created_by,
      created_by_name: users.name,
      created_at: leave_policy.created_at,
      updated_at: leave_policy.updated_at,
      remarks: leave_policy.remarks,
      is_default: leave_policy.is_default,
    })
    .from(leave_policy)
    .leftJoin(users, eq(leave_policy.created_by, users.uuid))
    .where(eq(leave_policy.uuid, uuid));

  const [data] = await leavePolicyPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
