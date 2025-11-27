import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { brand } from '@/routes/store/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { vendor } from '../schema';

const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(vendor).values(value).returning({
    name: vendor.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(vendor)
    .set(updates)
    .where(eq(vendor.uuid, uuid))
    .returning({
      name: vendor.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(vendor)
    .where(eq(vendor.uuid, uuid))
    .returning({
      name: vendor.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const vendorPromise = db
    .select({
      uuid: vendor.uuid,
      brand_uuid: vendor.brand_uuid,
      brand_name: brand.name,
      name: vendor.name,
      company_name: vendor.company_name,
      phone: vendor.phone,
      address: vendor.address,
      description: vendor.description,
      is_active: vendor.is_active,
      created_by: vendor.created_by,
      created_by_name: users.name,
      updated_by: vendor.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: vendor.created_at,
      updated_at: vendor.updated_at,
      remarks: vendor.remarks,
    })
    .from(vendor)
    .leftJoin(brand, eq(vendor.brand_uuid, brand.uuid))
    .leftJoin(users, eq(vendor.created_by, users.uuid))
    .leftJoin(
      updatedByUser,
      eq(vendor.updated_by, updatedByUser.uuid),
    )
    .orderBy(desc(vendor.created_at));

  const data = await vendorPromise;

  return c.json(data, HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const vendorPromise = db
    .select({
      uuid: vendor.uuid,
      brand_uuid: vendor.brand_uuid,
      brand_name: brand.name,
      name: vendor.name,
      company_name: vendor.company_name,
      phone: vendor.phone,
      address: vendor.address,
      description: vendor.description,
      is_active: vendor.is_active,
      created_by: vendor.created_by,
      created_by_name: users.name,
      updated_by: vendor.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: vendor.created_at,
      updated_at: vendor.updated_at,
      remarks: vendor.remarks,
    })
    .from(vendor)
    .leftJoin(brand, eq(vendor.brand_uuid, brand.uuid))
    .leftJoin(users, eq(vendor.created_by, users.uuid))
    .leftJoin(
      updatedByUser,
      eq(vendor.updated_by, updatedByUser.uuid),
    )
    .where(eq(vendor.uuid, uuid));

  const [data] = await vendorPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
