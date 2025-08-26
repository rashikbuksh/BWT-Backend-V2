import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { ship_address } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(ship_address).values(value).returning({
    name: ship_address.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(ship_address)
    .set(updates)
    .where(eq(ship_address.uuid, uuid))
    .returning({
      name: ship_address.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(ship_address)
    .where(eq(ship_address.uuid, uuid))
    .returning({
      name: ship_address.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const ship_addressPromise = db
    .select({
      uuid: ship_address.uuid,
      bill_info_uuid: ship_address.bill_info_uuid,
      name: ship_address.name,
      company_name: ship_address.company_name,
      phone: ship_address.phone,
      address: ship_address.address,
      city: ship_address.city,
      district: ship_address.district,
      zip: ship_address.zip,
      note: ship_address.note,
      created_by: ship_address.created_by,
      created_by_name: users.name,
      created_at: ship_address.created_at,
      updated_by: ship_address.updated_by,
      updated_at: ship_address.updated_at,
      remarks: ship_address.remarks,
    })
    .from(ship_address)
    .leftJoin(users, eq(ship_address.created_by, users.uuid))
    .orderBy(desc(ship_address.created_at));

  const data = await ship_addressPromise;

  return c.json(data, HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const ship_addressPromise = db
    .select({
      uuid: ship_address.uuid,
      bill_info_uuid: ship_address.bill_info_uuid,
      name: ship_address.name,
      company_name: ship_address.company_name,
      phone: ship_address.phone,
      address: ship_address.address,
      city: ship_address.city,
      district: ship_address.district,
      zip: ship_address.zip,
      note: ship_address.note,
      created_by: ship_address.created_by,
      created_by_name: users.name,
      created_at: ship_address.created_at,
      updated_by: ship_address.updated_by,
      updated_at: ship_address.updated_at,
      remarks: ship_address.remarks,
    })
    .from(ship_address)
    .leftJoin(users, eq(ship_address.created_by, users.uuid))
    .where(eq(ship_address.uuid, uuid));

  const [data] = await ship_addressPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
