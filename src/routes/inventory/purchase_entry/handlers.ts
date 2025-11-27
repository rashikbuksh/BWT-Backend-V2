import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { box, branch, floor, rack, warehouse } from '@/routes/store/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, GetPurchaseEntryByPurchaseUuidRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, purchase, purchase_entry } from '../schema';

const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(purchase_entry).values(value).returning({
    name: purchase_entry.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(purchase_entry)
    .set(updates)
    .where(eq(purchase_entry.uuid, uuid))
    .returning({
      name: purchase_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(purchase_entry)
    .where(eq(purchase_entry.uuid, uuid))
    .returning({
      name: purchase_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const purchaseEntryPromise = db
    .select({
      uuid: purchase_entry.uuid,
      purchase_uuid: purchase_entry.purchase_uuid,
      purchase_id: sql`CONCAT('SP',TO_CHAR(${purchase.created_at}, 'YY'), ' - ', ${purchase.id})`,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      serial_no: purchase_entry.serial_no,
      quantity: PG_DECIMAL_TO_FLOAT(purchase_entry.quantity),
      price_per_unit: PG_DECIMAL_TO_FLOAT(purchase_entry.price_per_unit),
      discount: PG_DECIMAL_TO_FLOAT(purchase_entry.discount),
      warehouse_uuid: purchase_entry.warehouse_uuid,
      warehouse_name: warehouse.name,
      rack_uuid: purchase_entry.rack_uuid,
      rack_name: rack.name,
      floor_uuid: purchase_entry.floor_uuid,
      floor_name: floor.name,
      box_uuid: purchase_entry.box_uuid,
      box_name: box.name,
      created_by: purchase_entry.created_by,
      created_by_name: users.name,
      updated_by: purchase_entry.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: purchase_entry.created_at,
      updated_at: purchase_entry.updated_at,
      remarks: purchase_entry.remarks,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
    })
    .from(purchase_entry)
    .leftJoin(
      users,
      eq(purchase_entry.created_by, users.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(purchase_entry.updated_by, updatedByUser.uuid),
    )
    .leftJoin(warehouse, eq(purchase_entry.warehouse_uuid, warehouse.uuid))
    .leftJoin(rack, eq(purchase_entry.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(purchase_entry.floor_uuid, floor.uuid))
    .leftJoin(box, eq(purchase_entry.box_uuid, box.uuid))
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(purchase, eq(purchase_entry.purchase_uuid, purchase.uuid))
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .orderBy(desc(purchase_entry.created_at));

  const data = await purchaseEntryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const purchaseEntryPromise = db
    .select({
      uuid: purchase_entry.uuid,
      purchase_uuid: purchase_entry.purchase_uuid,
      purchase_id: sql`CONCAT('SP',TO_CHAR(${purchase.created_at}, 'YY'), ' - ', ${purchase.id})`,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      serial_no: purchase_entry.serial_no,
      quantity: PG_DECIMAL_TO_FLOAT(purchase_entry.quantity),
      price_per_unit: PG_DECIMAL_TO_FLOAT(purchase_entry.price_per_unit),
      discount: PG_DECIMAL_TO_FLOAT(purchase_entry.discount),
      warehouse_uuid: purchase_entry.warehouse_uuid,
      warehouse_name: warehouse.name,
      rack_uuid: purchase_entry.rack_uuid,
      rack_name: rack.name,
      floor_uuid: purchase_entry.floor_uuid,
      floor_name: floor.name,
      box_uuid: purchase_entry.box_uuid,
      box_name: box.name,
      created_by: purchase_entry.created_by,
      created_by_name: users.name,
      updated_by: purchase_entry.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: purchase_entry.created_at,
      updated_at: purchase_entry.updated_at,
      remarks: purchase_entry.remarks,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
    })
    .from(purchase_entry)
    .leftJoin(
      users,
      eq(purchase_entry.created_by, users.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(purchase_entry.updated_by, updatedByUser.uuid),
    )
    .leftJoin(warehouse, eq(purchase_entry.warehouse_uuid, warehouse.uuid))
    .leftJoin(rack, eq(purchase_entry.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(purchase_entry.floor_uuid, floor.uuid))
    .leftJoin(box, eq(purchase_entry.box_uuid, box.uuid))
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(purchase, eq(purchase_entry.purchase_uuid, purchase.uuid))
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .where(eq(purchase_entry.uuid, uuid));

  const [data] = await purchaseEntryPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getPurchaseEntryByPurchaseUuid: AppRouteHandler<GetPurchaseEntryByPurchaseUuidRoute> = async (c: any) => {
  const { purchase_uuid } = c.req.valid('param');

  const purchaseEntryPromise = db
    .select({
      uuid: purchase_entry.uuid,
      purchase_uuid: purchase_entry.purchase_uuid,
      purchase_id: sql`CONCAT('SP',TO_CHAR(${purchase.created_at}, 'YY'), ' - ', ${purchase.id})`,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      serial_no: purchase_entry.serial_no,
      quantity: PG_DECIMAL_TO_FLOAT(purchase_entry.quantity),
      price_per_unit: PG_DECIMAL_TO_FLOAT(purchase_entry.price_per_unit),
      discount: PG_DECIMAL_TO_FLOAT(purchase_entry.discount),
      warehouse_uuid: purchase_entry.warehouse_uuid,
      warehouse_name: warehouse.name,
      rack_uuid: purchase_entry.rack_uuid,
      rack_name: rack.name,
      floor_uuid: purchase_entry.floor_uuid,
      floor_name: floor.name,
      box_uuid: purchase_entry.box_uuid,
      box_name: box.name,
      created_by: purchase_entry.created_by,
      created_by_name: users.name,
      created_at: purchase_entry.created_at,
      updated_at: purchase_entry.updated_at,
      remarks: purchase_entry.remarks,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
    })
    .from(purchase_entry)
    .leftJoin(
      users,
      eq(purchase_entry.created_by, users.uuid),
    )
    .leftJoin(warehouse, eq(purchase_entry.warehouse_uuid, warehouse.uuid))
    .leftJoin(rack, eq(purchase_entry.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(purchase_entry.floor_uuid, floor.uuid))
    .leftJoin(box, eq(purchase_entry.box_uuid, box.uuid))
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(purchase, eq(purchase_entry.purchase_uuid, purchase.uuid))
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .where(eq(purchase_entry.purchase_uuid, purchase_uuid));

  const data = await purchaseEntryPromise;

  // if (!data)
  //   return DataNotFound(c);
  return c.json(data || [], HSCode.OK);
};
