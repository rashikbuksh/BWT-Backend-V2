import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { special_holidays, users, workplace } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(special_holidays).values(value).returning({
    name: special_holidays.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(special_holidays)
    .set(updates)
    .where(eq(special_holidays.uuid, uuid))
    .returning({
      name: special_holidays.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(special_holidays)
    .where(eq(special_holidays.uuid, uuid))
    .returning({
      name: special_holidays.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const specialHolidaysPromise = db
    .select({
      uuid: special_holidays.uuid,
      id: special_holidays.id,
      name: special_holidays.name,
      workplace_uuid: special_holidays.workplace_uuid,
      workplace_name: workplace.name,
      from_date: special_holidays.from_date,
      to_date: special_holidays.to_date,
      created_by: special_holidays.created_by,
      created_by_name: users.name,
      created_at: special_holidays.created_at,
      updated_at: special_holidays.updated_at,
      remarks: special_holidays.remarks,
    })
    .from(special_holidays)
    .leftJoin(
      workplace,
      eq(special_holidays.workplace_uuid, workplace.uuid),
    )
    .leftJoin(users, eq(special_holidays.created_by, users.uuid))
    .orderBy(desc(special_holidays.created_at));

  const data = await specialHolidaysPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const specialHolidaysPromise = db
    .select({
      uuid: special_holidays.uuid,
      id: special_holidays.id,
      name: special_holidays.name,
      workplace_uuid: special_holidays.workplace_uuid,
      workplace_name: workplace.name,
      from_date: special_holidays.from_date,
      to_date: special_holidays.to_date,
      created_by: special_holidays.created_by,
      created_by_name: users.name,
      created_at: special_holidays.created_at,
      updated_at: special_holidays.updated_at,
      remarks: special_holidays.remarks,
    })
    .from(special_holidays)
    .leftJoin(
      workplace,
      eq(special_holidays.workplace_uuid, workplace.uuid),
    )
    .leftJoin(users, eq(special_holidays.created_by, users.uuid))
    .where(eq(special_holidays.uuid, uuid));

  const [data] = await specialHolidaysPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
