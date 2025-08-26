import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { bill_info } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(bill_info).values(value).returning({
    name: bill_info.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(bill_info)
    .set(updates)
    .where(eq(bill_info.uuid, uuid))
    .returning({
      name: bill_info.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(bill_info)
    .where(eq(bill_info.uuid, uuid))
    .returning({
      name: bill_info.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const bill_infoPromise = db
    .select({
      uuid: bill_info.uuid,
      user_uuid: bill_info.user_uuid,
      name: bill_info.name,
      phone: bill_info.phone,
      address: bill_info.address,
      city: bill_info.city,
      district: bill_info.district,
      note: bill_info.note,
      is_ship_different: bill_info.is_ship_different,
      created_by: bill_info.created_by,
      created_by_name: users.name,
      created_at: bill_info.created_at,
      updated_by: bill_info.updated_by,
      updated_at: bill_info.updated_at,
      remarks: bill_info.remarks,
    })
    .from(bill_info)
    .leftJoin(users, eq(bill_info.created_by, users.uuid))
    .orderBy(desc(bill_info.created_at));

  const data = await bill_infoPromise;

  return c.json(data, HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const bill_infoPromise = db
    .select({
      uuid: bill_info.uuid,
      user_uuid: bill_info.user_uuid,
      name: bill_info.name,
      phone: bill_info.phone,
      address: bill_info.address,
      city: bill_info.city,
      district: bill_info.district,
      note: bill_info.note,
      is_ship_different: bill_info.is_ship_different,
      created_by: bill_info.created_by,
      created_by_name: users.name,
      created_at: bill_info.created_at,
      updated_by: bill_info.updated_by,
      updated_at: bill_info.updated_at,
      remarks: bill_info.remarks,
    })
    .from(bill_info)
    .leftJoin(users, eq(bill_info.created_by, users.uuid))
    .where(eq(bill_info.uuid, uuid));

  const [data] = await bill_infoPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
