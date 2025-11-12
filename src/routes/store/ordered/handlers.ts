import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { ordered, product_variant } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(ordered).values(value).returning({
    name: ordered.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(ordered)
    .set(updates)
    .where(eq(ordered.uuid, uuid))
    .returning({
      name: ordered.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(ordered)
    .where(eq(ordered.uuid, uuid))
    .returning({
      name: ordered.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const productVariantPromise = db
    .select({
      uuid: ordered.uuid,
      bill_info_uuid: ordered.bill_info_uuid,
      product_variant_uuid: ordered.product_variant_uuid,
      quantity: PG_DECIMAL_TO_FLOAT(ordered.quantity),
      selling_price: PG_DECIMAL_TO_FLOAT(ordered.selling_price),
      is_paid: ordered.is_paid,
      order_status: ordered.order_status,
      created_by: ordered.created_by,
      created_by_name: createdByUser.name,
      created_at: ordered.created_at,
      updated_by: ordered.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: ordered.updated_at,
      remarks: ordered.remarks,
      serial_entry: ordered.serial_entry,
      affiliate_id: ordered.affiliate_id,
    })
    .from(ordered)
    .leftJoin(createdByUser, eq(ordered.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(ordered.updated_by, updatedByUser.uuid))
    .orderBy(desc(ordered.created_at));

  const data = await productVariantPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: ordered.uuid,
    bill_info_uuid: ordered.bill_info_uuid,
    product_variant_uuid: ordered.product_variant_uuid,
    quantity: PG_DECIMAL_TO_FLOAT(ordered.quantity),
    selling_price: PG_DECIMAL_TO_FLOAT(ordered.selling_price),
    is_paid: ordered.is_paid,
    order_status: ordered.order_status,
    created_by: ordered.created_by,
    created_by_name: createdByUser.name,
    created_at: ordered.created_at,
    updated_by: ordered.updated_by,
    updated_by_name: updatedByUser.name,
    updated_at: ordered.updated_at,
    remarks: ordered.remarks,
    serial_entry: ordered.serial_entry,
    affiliate_id: ordered.affiliate_id,
  })
    .from(ordered)
    .leftJoin(createdByUser, eq(ordered.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(ordered.updated_by, updatedByUser.uuid))
    .where(eq(product_variant.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
