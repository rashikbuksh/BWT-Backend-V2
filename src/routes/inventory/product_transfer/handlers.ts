import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { branch, warehouse } from '@/routes/store/schema';
import * as workSchema from '@/routes/work/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByOrderUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { product, product_transfer, purchase_entry } from '../schema';

const user = alias(users, 'user');
const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(product_transfer).values(value).returning({
    name: product_transfer.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(product_transfer)
    .set(updates)
    .where(eq(product_transfer.uuid, uuid))
    .returning({
      name: product_transfer.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(product_transfer)
    .where(eq(product_transfer.uuid, uuid))
    .returning({
      name: product_transfer.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const productTransferPromise = db
    .select({
      id: product_transfer.id,
      product_transfer_id: sql`CONCAT('PT', TO_CHAR(${product_transfer.created_at}, 'YY'), '-', ${product_transfer.id})`,
      uuid: product_transfer.uuid,
      purchase_entry_uuid: product_transfer.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.name,
      warehouse_uuid: product_transfer.warehouse_uuid,
      warehouse_name: warehouse.name,
      order_uuid: product_transfer.order_uuid,
      order_id: sql`CONCAT('WO', TO_CHAR(${workSchema.order.created_at}, 'YY'), '-', ${workSchema.order.id})`,
      quantity: PG_DECIMAL_TO_FLOAT(product_transfer.quantity),
      created_by: product_transfer.created_by,
      created_by_name: users.name,
      updated_by: product_transfer.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: product_transfer.created_at,
      updated_at: product_transfer.updated_at,
      remarks: product_transfer.remarks,
      info_uuid: workSchema.order.info_uuid,
      info_id: sql`CONCAT ('WI', TO_CHAR(${workSchema.info.created_at}::timestamp, 'YY'), '-', ${workSchema.info.id})`,
      user_uuid: workSchema.info.user_uuid,
      user_name: user.name,
      serial_no: purchase_entry.serial_no,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
    })
    .from(product_transfer)
    .leftJoin(
      purchase_entry,
      eq(product_transfer.purchase_entry_uuid, purchase_entry.uuid),
    )
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(
      warehouse,
      eq(product_transfer.warehouse_uuid, warehouse.uuid),
    )
    .leftJoin(
      workSchema.order,
      eq(product_transfer.order_uuid, workSchema.order.uuid),
    )
    .leftJoin(
      users,
      eq(product_transfer.created_by, users.uuid),
    )
    .leftJoin(
      updatedByUser,
      eq(product_transfer.updated_by, updatedByUser.uuid),
    )
    .leftJoin(
      workSchema.info,
      eq(workSchema.order.info_uuid, workSchema.info.uuid),
    )
    .leftJoin(user, eq(workSchema.info.user_uuid, user.uuid))
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid));

  const data = await productTransferPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const productTransferPromise = db
    .select({
      id: product_transfer.id,
      product_transfer_id: sql`CONCAT('PT', TO_CHAR(${product_transfer.created_at}, 'YY'), '-', ${product_transfer.id})`,
      uuid: product_transfer.uuid,
      purchase_entry_uuid: product_transfer.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.name,
      warehouse_uuid: product_transfer.warehouse_uuid,
      warehouse_name: warehouse.name,
      order_uuid: product_transfer.order_uuid,
      order_id: sql`CONCAT('WO', TO_CHAR(${workSchema.order.created_at}, 'YY'), '-', ${workSchema.order.id})`,
      quantity: PG_DECIMAL_TO_FLOAT(product_transfer.quantity),
      created_by: product_transfer.created_by,
      created_by_name: users.name,
      updated_by: product_transfer.updated_by,
      updated_by_name: updatedByUser.name,
      created_at: product_transfer.created_at,
      updated_at: product_transfer.updated_at,
      remarks: product_transfer.remarks,
      info_uuid: workSchema.order.info_uuid,
      info_id: sql`CONCAT ('WI', TO_CHAR(${workSchema.info.created_at}::timestamp, 'YY'), '-', ${workSchema.info.id})`,
      user_uuid: workSchema.info.user_uuid,
      user_name: user.name,
      serial_no: purchase_entry.serial_no,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
    })
    .from(product_transfer)
    .leftJoin(
      purchase_entry,
      eq(product_transfer.purchase_entry_uuid, purchase_entry.uuid),
    )
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(
      warehouse,
      eq(product_transfer.warehouse_uuid, warehouse.uuid),
    )
    .leftJoin(
      workSchema.order,
      eq(product_transfer.order_uuid, workSchema.order.uuid),
    )
    .leftJoin(
      users,
      eq(product_transfer.created_by, users.uuid),
    )
    .leftJoin(
      workSchema.info,
      eq(workSchema.order.info_uuid, workSchema.info.uuid),
    )
    .leftJoin(user, eq(workSchema.info.user_uuid, user.uuid))
    .leftJoin(
      updatedByUser,
      eq(product_transfer.updated_by, updatedByUser.uuid),
    )
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .where(eq(product_transfer.uuid, uuid));

  const [data] = await productTransferPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByOrderUuid: AppRouteHandler<GetByOrderUuidRoute> = async (c: any) => {
  const { order_uuid } = c.req.valid('param');

  if (!order_uuid)
    return ObjectNotFound(c);
  const productTransferPromise = db
    .select({
      id: product_transfer.id,
      uuid: product_transfer.uuid,
      purchase_entry_uuid: product_transfer.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.name,
      warehouse_uuid: product_transfer.warehouse_uuid,
      warehouse_name: warehouse.name,
      order_uuid: product_transfer.order_uuid,
      created_by: product_transfer.created_by,
      created_by_name: users.name,
      created_at: product_transfer.created_at,
      updated_at: product_transfer.updated_at,
      remarks: product_transfer.remarks,
      quantity: sql`SUM(${product_transfer.quantity})::float8`,
      info_uuid: workSchema.order.info_uuid,
      info_id: sql`CONCAT ('WI', TO_CHAR(${
        workSchema.info.created_at
      }::timestamp, 'YY'), '-', ${workSchema.info.id})`,
      user_uuid: workSchema.info.user_uuid,
      user_name: user.name,
      serial_no: purchase_entry.serial_no,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
    })
    .from(product_transfer)
    .leftJoin(
      users,
      eq(product_transfer.created_by, users.uuid),
    )
    .leftJoin(
      purchase_entry,
      eq(product_transfer.purchase_entry_uuid, purchase_entry.uuid),
    )
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(
      warehouse,
      eq(product_transfer.warehouse_uuid, warehouse.uuid),
    )
    .leftJoin(
      workSchema.order,
      eq(product_transfer.order_uuid, workSchema.order.uuid),
    )
    .leftJoin(
      workSchema.info,
      eq(workSchema.order.info_uuid, workSchema.info.uuid),
    )
    .leftJoin(user, eq(workSchema.info.user_uuid, user.uuid))
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .where(eq(product_transfer.order_uuid, order_uuid))

    .groupBy(
      product_transfer.id,
      product_transfer.uuid,
      product_transfer.purchase_entry_uuid,
      purchase_entry.product_uuid,
      product.name,
      product_transfer.warehouse_uuid,
      warehouse.name,
      product_transfer.order_uuid,
      product_transfer.created_by,
      users.name,
      product_transfer.created_at,
      product_transfer.updated_at,
      product_transfer.remarks,
      workSchema.order.info_uuid,
      workSchema.info.user_uuid,
      user.name,
      workSchema.info.id,
      workSchema.info.created_at,
      warehouse.assigned,
      purchase_entry.serial_no,
      branch.name,
      warehouse.branch_uuid,
    );

  const data = await productTransferPromise;

  return c.json(data || [], HSCode.OK);
};
