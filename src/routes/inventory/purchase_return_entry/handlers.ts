import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByPurchaseReturnUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, purchase_entry, purchase_return, purchase_return_entry } from '../schema';

const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(purchase_return_entry).values(value).returning({
    name: purchase_return_entry.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(purchase_return_entry)
    .set(updates)
    .where(eq(purchase_return_entry.uuid, uuid))
    .returning({
      name: purchase_return_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(purchase_return_entry)
    .where(eq(purchase_return_entry.uuid, uuid))
    .returning({
      name: purchase_return_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const purchaseReturnEntryPromise = db
    .select({
      uuid: purchase_return_entry.uuid,
      purchase_return_uuid: purchase_return_entry.purchase_return_uuid,
      purchase_return_id: sql`CONCAT('SPR',TO_CHAR(${purchase_return.created_at}, 'YY'),' - ',${purchase_return.id})`,
      purchase_entry_uuid: purchase_return_entry.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      quantity: PG_DECIMAL_TO_FLOAT(purchase_return_entry.quantity),
      created_by: purchase_return_entry.created_by,
      created_by_name: users.name,
      updated_by: purchase_return_entry.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: purchase_return_entry.created_at,
      updated_at: purchase_return_entry.updated_at,
      remarks: purchase_return_entry.remarks,
      serial_no: purchase_entry.serial_no,
    })
    .from(purchase_return_entry)
    .leftJoin(
      purchase_entry,
      eq(purchase_return_entry.purchase_entry_uuid, purchase_entry.uuid),
    )
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(
      users,
      eq(purchase_return_entry.created_by, users.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(purchase_return_entry.updated_by, updatedByUser.uuid),
    )
    .leftJoin(
      purchase_return,
      eq(purchase_return_entry.purchase_return_uuid, purchase_return.uuid),
    )
    .orderBy(desc(purchase_return_entry.created_at));

  const data = await purchaseReturnEntryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const purchaseReturnEntryPromise = db
    .select({
      uuid: purchase_return_entry.uuid,
      purchase_return_uuid: purchase_return_entry.purchase_return_uuid,
      purchase_return_id: sql`CONCAT('SPR',TO_CHAR(${purchase_return.created_at}, 'YY'),' - ',${purchase_return.id})`,
      purchase_entry_uuid: purchase_return_entry.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      quantity: PG_DECIMAL_TO_FLOAT(purchase_return_entry.quantity),
      created_by: purchase_return_entry.created_by,
      created_by_name: users.name,
      updated_by: purchase_return_entry.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: purchase_return_entry.created_at,
      updated_at: purchase_return_entry.updated_at,
      remarks: purchase_return_entry.remarks,
      serial_no: purchase_entry.serial_no,
    })
    .from(purchase_return_entry)
    .leftJoin(
      purchase_entry,
      eq(purchase_return_entry.purchase_entry_uuid, purchase_entry.uuid),
    )
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(
      users,
      eq(purchase_return_entry.created_by, users.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(purchase_return_entry.updated_by, updatedByUser.uuid),
    )
    .leftJoin(
      purchase_return,
      eq(purchase_return_entry.purchase_return_uuid, purchase_return.uuid),
    )
    .where(eq(purchase_return_entry.uuid, uuid));

  const [data] = await purchaseReturnEntryPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByPurchaseReturnUuid: AppRouteHandler<GetByPurchaseReturnUuidRoute> = async (c: any) => {
  const { purchase_return_uuid } = c.req.valid('param');

  const purchaseReturnEntryPromise = db
    .select({
      uuid: purchase_return_entry.uuid,
      purchase_return_uuid: purchase_return_entry.purchase_return_uuid,
      purchase_return_id: sql`CONCAT('SPR',TO_CHAR(${purchase_return.created_at}, 'YY'),' - ',${purchase_return.id})`,
      purchase_entry_uuid: purchase_return_entry.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      quantity: PG_DECIMAL_TO_FLOAT(purchase_return_entry.quantity),
      created_by: purchase_return_entry.created_by,
      created_by_name: users.name,
      created_at: purchase_return_entry.created_at,
      updated_at: purchase_return_entry.updated_at,
      remarks: purchase_return_entry.remarks,
      serial_no: purchase_entry.serial_no,
    })
    .from(purchase_return_entry)
    .leftJoin(
      purchase_entry,
      eq(purchase_return_entry.purchase_entry_uuid, purchase_entry.uuid),
    )
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(
      users,
      eq(purchase_return_entry.created_by, users.uuid),
    )
    .leftJoin(
      purchase_return,
      eq(purchase_return_entry.purchase_return_uuid, purchase_return.uuid),
    )
    .where(eq(purchase_return_entry.purchase_return_uuid, purchase_return_uuid));

  const data = await purchaseReturnEntryPromise;

  return c.json(data || [], HSCode.OK);
};
