import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employment_type, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employment_type).values(value).returning({
    name: employment_type.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employment_type)
    .set(updates)
    .where(eq(employment_type.uuid, uuid))
    .returning({
      name: employment_type.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(employment_type)
    .where(eq(employment_type.uuid, uuid))
    .returning({
      name: employment_type.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employmentTypePromise = db
    .select({
      uuid: employment_type.uuid,
      id: employment_type.id,
      name: employment_type.name,
      status: employment_type.status,
      created_by: employment_type.created_by,
      created_by_name: users.name,
      created_at: employment_type.created_at,
      updated_at: employment_type.updated_at,
      remarks: employment_type.remarks,
    })
    .from(employment_type)
    .leftJoin(users, eq(employment_type.created_by, users.uuid))
    .orderBy(desc(employment_type.created_at));

  const data = await employmentTypePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employmentTypePromise = db
    .select({
      uuid: employment_type.uuid,
      id: employment_type.id,
      name: employment_type.name,
      status: employment_type.status,
      created_by: employment_type.created_by,
      created_by_name: users.name,
      created_at: employment_type.created_at,
      updated_at: employment_type.updated_at,
      remarks: employment_type.remarks,
    })
    .from(employment_type)
    .leftJoin(users, eq(employment_type.created_by, users.uuid))
    .where(eq(employment_type.uuid, uuid));

  const [data] = await employmentTypePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
