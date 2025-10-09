import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee_log, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employee_log).values(value).returning({
    name: employee_log.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { id } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee_log)
    .set(updates)
    .where(eq(employee_log.id, id))
    .returning({
      name: employee_log.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const [data] = await db.delete(employee_log)
    .where(eq(employee_log.id, id))
    .returning({
      name: employee_log.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employee_logPromise = db
    .select({
      id: employee_log.id,
      employee_uuid: employee_log.employee_uuid,
      type: employee_log.type,
      type_uuid: employee_log.type_uuid,
      created_by: employee_log.created_by,
      created_by_name: users.name,
      created_at: employee_log.created_at,
      updated_at: employee_log.updated_at,
      remarks: employee_log.remarks,
    })
    .from(employee_log)
    .leftJoin(users, eq(employee_log.created_by, users.uuid))
    .orderBy(desc(employee_log.created_at));

  const data = await employee_logPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { id } = c.req.valid('param');

  const employee_logPromise = db
    .select({
      id: employee_log.id,
      employee_uuid: employee_log.employee_uuid,
      type: employee_log.type,
      type_uuid: employee_log.type_uuid,
      created_by: employee_log.created_by,
      created_by_name: users.name,
      created_at: employee_log.created_at,
      updated_at: employee_log.updated_at,
      remarks: employee_log.remarks,
    })
    .from(employee_log)
    .leftJoin(users, eq(employee_log.created_by, users.uuid))
    .where(eq(employee_log.id, id));

  const [data] = await employee_logPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
