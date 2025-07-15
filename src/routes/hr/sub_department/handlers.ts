import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { sub_department, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(sub_department).values(value).returning({
    name: sub_department.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(sub_department)
    .set(updates)
    .where(eq(sub_department.uuid, uuid))
    .returning({
      name: sub_department.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(sub_department)
    .where(eq(sub_department.uuid, uuid))
    .returning({
      name: sub_department.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const subDepartmentPromise = db
    .select({
      uuid: sub_department.uuid,
      id: sub_department.id,
      name: sub_department.name,
      hierarchy: sub_department.hierarchy,
      status: sub_department.status,
      created_by: sub_department.created_by,
      created_by_name: users.name,
      created_at: sub_department.created_at,
      updated_at: sub_department.updated_at,
      remarks: sub_department.remarks,
    })
    .from(sub_department)
    .leftJoin(users, eq(sub_department.created_by, users.uuid))
    .orderBy(desc(sub_department.created_at));

  const data = await subDepartmentPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const subDepartmentPromise = db
    .select({
      uuid: sub_department.uuid,
      id: sub_department.id,
      name: sub_department.name,
      hierarchy: sub_department.hierarchy,
      status: sub_department.status,
      created_by: sub_department.created_by,
      created_by_name: users.name,
      created_at: sub_department.created_at,
      updated_at: sub_department.updated_at,
      remarks: sub_department.remarks,
    })
    .from(sub_department)
    .leftJoin(users, eq(sub_department.created_by, users.uuid))
    .where(eq(sub_department.uuid, uuid));

  const [data] = await subDepartmentPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
