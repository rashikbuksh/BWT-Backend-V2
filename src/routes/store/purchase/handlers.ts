import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { branch, purchase, vendor } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(purchase).values(value).returning({
    name: purchase.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(purchase)
    .set(updates)
    .where(eq(purchase.uuid, uuid))
    .returning({
      name: purchase.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(purchase)
    .where(eq(purchase.uuid, uuid))
    .returning({
      name: purchase.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: purchase.uuid,
    id: purchase.id,
    vendor_uuid: purchase.vendor_uuid,
    vendor_name: vendor.name,
    branch_uuid: purchase.branch_uuid,
    branch_name: branch.name,
    date: purchase.date,
    payment_mode: purchase.payment_mode,
    created_by: purchase.created_by,
    created_by_name: users.name,
    created_at: purchase.created_at,
    updated_at: purchase.updated_at,
    remarks: purchase.remarks,
  })
    .from(purchase)
    .leftJoin(users, eq(purchase.created_by, users.uuid))
    .leftJoin(vendor, eq(purchase.vendor_uuid, vendor.uuid))
    .leftJoin(branch, eq(purchase.branch_uuid, branch.uuid))
    .orderBy(desc(purchase.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: purchase.uuid,
    id: purchase.id,
    vendor_uuid: purchase.vendor_uuid,
    vendor_name: vendor.name,
    branch_uuid: purchase.branch_uuid,
    branch_name: branch.name,
    date: purchase.date,
    payment_mode: purchase.payment_mode,
    created_by: purchase.created_by,
    created_by_name: users.name,
    created_at: purchase.created_at,
    updated_at: purchase.updated_at,
    remarks: purchase.remarks,
  })
    .from(purchase)
    .leftJoin(users, eq(purchase.created_by, users.uuid))
    .leftJoin(vendor, eq(purchase.vendor_uuid, vendor.uuid))
    .leftJoin(branch, eq(purchase.branch_uuid, branch.uuid))
    .where(eq(purchase.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
