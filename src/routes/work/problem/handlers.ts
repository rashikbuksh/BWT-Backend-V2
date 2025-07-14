import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { problem } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(problem).values(value).returning({
    name: problem.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(problem)
    .set(updates)
    .where(eq(problem.uuid, uuid))
    .returning({
      name: problem.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(problem)
    .where(eq(problem.uuid, uuid))
    .returning({
      name: problem.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const problemPromise = db
    .select({
      uuid: problem.uuid,
      name: problem.name,
      category: problem.category,
      created_by: problem.created_by,
      created_by_name: users.name,
      created_at: problem.created_at,
      updated_at: problem.updated_at,
      remarks: problem.remarks,
    })
    .from(problem)
    .leftJoin(users, eq(problem.created_by, users.uuid))
    .orderBy(desc(problem.created_at));

  const data = await problemPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const problemPromise = db.select({
    uuid: problem.uuid,
    name: problem.name,
    category: problem.category,
    created_by: problem.created_by,
    created_by_name: users.name,
    created_at: problem.created_at,
    updated_at: problem.updated_at,
    remarks: problem.remarks,
  })
    .from(problem)
    .leftJoin(users, eq(problem.created_by, users.uuid))
    .where(eq(problem.uuid, uuid));

  const data = await problemPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
