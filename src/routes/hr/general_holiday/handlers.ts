import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { unionAll } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetAllGeneralAndSpecialHolidaysRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { general_holiday, special_holidays, users } from '../schema';

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

export const getAllGeneralAndSpecialHolidays: AppRouteHandler<GetAllGeneralAndSpecialHolidaysRoute> = async (c: any) => {
  // const { year } = c.req.valid('query');

  const generalPromise = db
    .select({
      uuid: general_holiday.uuid,
      id: general_holiday.id,
      name: general_holiday.name,
      from_date: general_holiday.date,
      to_date: general_holiday.date,
      type: sql`'General'`,
      created_by: general_holiday.created_by,
      created_by_name: users.name,
      created_at: general_holiday.created_at,
      updated_at: general_holiday.updated_at,
      remarks: general_holiday.remarks,
    })
    .from(general_holiday)
    .leftJoin(users, eq(general_holiday.created_by, users.uuid));

  const specialPromise = db
    .select({
      uuid: special_holidays.uuid,
      id: special_holidays.id,
      name: special_holidays.name,
      from_date: special_holidays.from_date,
      to_date: special_holidays.to_date,
      type: sql`'Special'`,
      created_by: special_holidays.created_by,
      created_by_name: users.name,
      created_at: special_holidays.created_at,
      updated_at: special_holidays.updated_at,
      remarks: special_holidays.remarks,
    })
    .from(special_holidays)
    .leftJoin(users, eq(special_holidays.created_by, users.uuid));

  const data = await unionAll(generalPromise, specialPromise);

  return c.json(data || [], HSCode.OK);
};
