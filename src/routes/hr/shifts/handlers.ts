import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { shifts, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(shifts).values(value).returning({
    name: shifts.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(shifts)
    .set(updates)
    .where(eq(shifts.uuid, uuid))
    .returning({
      name: shifts.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(shifts)
    .where(eq(shifts.uuid, uuid))
    .returning({
      name: shifts.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const shiftsPromise = db
    .select({
      uuid: shifts.uuid,
      id: shifts.id,
      name: shifts.name,
      start_time: shifts.start_time,
      end_time: shifts.end_time,
      late_time: shifts.late_time,
      early_exit_before: shifts.early_exit_before,
      first_half_end: shifts.first_half_end,
      break_time_end: shifts.break_time_end,
      default_shift: shifts.default_shift,
      color: shifts.color,
      status: shifts.status,
      created_by: shifts.created_by,
      created_by_name: users.name,
      created_at: shifts.created_at,
      updated_at: shifts.updated_at,
      remarks: shifts.remarks,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.created_by, users.uuid))
    .orderBy(desc(shifts.created_at));

  const data = await shiftsPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const shiftsPromise = db
    .select({
      uuid: shifts.uuid,
      id: shifts.id,
      name: shifts.name,
      start_time: shifts.start_time,
      end_time: shifts.end_time,
      late_time: shifts.late_time,
      early_exit_before: shifts.early_exit_before,
      first_half_end: shifts.first_half_end,
      break_time_end: shifts.break_time_end,
      default_shift: shifts.default_shift,
      color: shifts.color,
      status: shifts.status,
      created_by: shifts.created_by,
      created_by_name: users.name,
      created_at: shifts.created_at,
      updated_at: shifts.updated_at,
      remarks: shifts.remarks,
    })
    .from(shifts)
    .leftJoin(users, eq(shifts.created_by, users.uuid))
    .where(eq(shifts.uuid, uuid));

  const [data] = await shiftsPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
