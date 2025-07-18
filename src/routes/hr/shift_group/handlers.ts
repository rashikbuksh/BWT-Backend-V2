import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { shift_group, shifts, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(shift_group).values(value).returning({
    name: shift_group.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(shift_group)
    .set(updates)
    .where(eq(shift_group.uuid, uuid))
    .returning({
      name: shift_group.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(shift_group)
    .where(eq(shift_group.uuid, uuid))
    .returning({
      name: shift_group.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const shiftGroupPromise = db
    .select({
      uuid: shift_group.uuid,
      id: shift_group.id,
      name: shift_group.name,
      default_shift: shift_group.default_shift,
      shifts_uuid: shift_group.shifts_uuid,
      shifts_name: shifts.name,
      status: shift_group.status,
      off_days: shift_group.off_days,
      effective_date: shift_group.effective_date,
      created_by: shift_group.created_by,
      created_by_name: users.name,
      created_at: shift_group.created_at,
      updated_at: shift_group.updated_at,
      remarks: shift_group.remarks,
    })
    .from(shift_group)
    .leftJoin(shifts, eq(shift_group.shifts_uuid, shifts.uuid))
    .leftJoin(users, eq(shift_group.created_by, users.uuid))
    .orderBy(desc(shift_group.created_at));

  const data = await shiftGroupPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const shiftGroupPromise = db
    .select({
      uuid: shift_group.uuid,
      id: shift_group.id,
      name: shift_group.name,
      default_shift: shift_group.default_shift,
      shifts_uuid: shift_group.shifts_uuid,
      shifts_name: shifts.name,
      status: shift_group.status,
      off_days: shift_group.off_days,
      effective_date: shift_group.effective_date,
      created_by: shift_group.created_by,
      created_by_name: users.name,
      created_at: shift_group.created_at,
      updated_at: shift_group.updated_at,
      remarks: shift_group.remarks,
    })
    .from(shift_group)
    .leftJoin(shifts, eq(shift_group.shifts_uuid, shifts.uuid))
    .leftJoin(users, eq(shift_group.created_by, users.uuid))
    .where(eq(shift_group.uuid, uuid));

  const [data] = await shiftGroupPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
