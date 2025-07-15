import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { general_holiday, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(general_holiday).values(value).returning({
    name: general_holiday.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(general_holiday)
    .set(updates)
    .where(eq(general_holiday.uuid, uuid))
    .returning({
      name: general_holiday.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(general_holiday)
    .where(eq(general_holiday.uuid, uuid))
    .returning({
      name: general_holiday.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const generalHolidayPromise = db
    .select({
      uuid: general_holiday.uuid,
      id: general_holiday.id,
      name: general_holiday.name,
      date: general_holiday.date,
      created_by: general_holiday.created_by,
      created_by_name: users.name,
      created_at: general_holiday.created_at,
      updated_at: general_holiday.updated_at,
      remarks: general_holiday.remarks,
    })
    .from(general_holiday)
    .leftJoin(users, eq(general_holiday.created_by, users.uuid))
    .orderBy(desc(general_holiday.created_at));

  const data = await generalHolidayPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const generalHolidayPromise = db
    .select({
      uuid: general_holiday.uuid,
      id: general_holiday.id,
      name: general_holiday.name,
      date: general_holiday.date,
      created_by: general_holiday.created_by,
      created_by_name: users.name,
      created_at: general_holiday.created_at,
      updated_at: general_holiday.updated_at,
      remarks: general_holiday.remarks,
    })
    .from(general_holiday)
    .leftJoin(users, eq(general_holiday.created_by, users.uuid))
    .where(eq(general_holiday.uuid, uuid));

  const [data] = await generalHolidayPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
