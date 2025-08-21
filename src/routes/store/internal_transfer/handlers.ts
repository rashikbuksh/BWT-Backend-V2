import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { box, branch, floor, internal_transfer, product, purchase_entry, rack, warehouse } from '../schema';

const fromWarehouse = alias(warehouse, 'from_warehouse');
const toWarehouse = alias(warehouse, 'to_warehouse');
const fromBranch = alias(branch, 'from_branch');
const toBranch = alias(branch, 'to_branch');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(internal_transfer).values(value).returning({
    name: internal_transfer.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(internal_transfer)
    .set(updates)
    .where(eq(internal_transfer.uuid, uuid))
    .returning({
      name: internal_transfer.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(internal_transfer)
    .where(eq(internal_transfer.uuid, uuid))
    .returning({
      name: internal_transfer.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const internalTransferPromise = db
    .select({
      uuid: internal_transfer.uuid,
      id: internal_transfer.id,
      internal_transfer_id: sql`CONCAT(
                                    'SIT',
                                        TO_CHAR(${internal_transfer.created_at}, 'YY'),
                                        ' - ',
                                        ${internal_transfer.id}
                                    )`,
      purchase_entry_uuid: internal_transfer.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      rack_uuid: internal_transfer.rack_uuid,
      rack_name: rack.name,
      floor_uuid: internal_transfer.floor_uuid,
      floor_name: floor.name,
      box_uuid: internal_transfer.box_uuid,
      box_name: box.name,
      quantity: PG_DECIMAL_TO_FLOAT(internal_transfer.quantity),
      created_by: internal_transfer.created_by,
      created_by_name: users.name,
      created_at: internal_transfer.created_at,
      updated_at: internal_transfer.updated_at,
      remarks: internal_transfer.remarks,
      from_warehouse_uuid: internal_transfer.from_warehouse_uuid,
      from_warehouse_name: fromWarehouse.name,
      // from_warehouse: PG_DECIMAL_TO_FLOAT(
      //   sql`CASE WHEN ${
      //     fromWarehouse.assigned
      //   } ='warehouse_1' THEN ${product.warehouse_1} WHEN ${
      //     fromWarehouse.assigned
      //   } = 'warehouse_2' THEN ${product.warehouse_2} ELSE ${product.warehouse_3} END`,
      // ),
      // form_warehouse: sql`(CASE
      //   WHEN ${fromWarehouse.assigned} = 'warehouse_1' THEN COALESCE(${product.warehouse_1}, 0)
      //   WHEN ${fromWarehouse.assigned} = 'warehouse_2' THEN COALESCE(${product.warehouse_2}, 0)
      //   ELSE COALESCE(${product.warehouse_3}, 0)
      // END)::float8`,
      to_warehouse_uuid: internal_transfer.to_warehouse_uuid,
      to_warehouse_name: toWarehouse.name,
      // to_warehouse: PG_DECIMAL_TO_FLOAT(
      //   sql`CASE WHEN ${
      //     toWarehouse.assigned
      //   } = 'warehouse_1' THEN ${product.warehouse_1} WHEN ${
      //     toWarehouse.assigned
      //   } = 'warehouse_2' THEN ${product.warehouse_2} ELSE ${product.warehouse_3} END`,
      // ),
      // to_warehouse:
      //   sql`(CASE
      //     WHEN ${toWarehouse.assigned} = 'warehouse_1' THEN COALESCE(${product.warehouse_1}, 0)
      //     WHEN ${toWarehouse.assigned} = 'warehouse_2' THEN COALESCE(${product.warehouse_2}, 0)
      //     ELSE COALESCE(${product.warehouse_3}, 0)
      //   END)::float8`,
      from_branch_uuid: fromWarehouse.branch_uuid,
      from_branch_name: fromBranch.name,
      to_branch_uuid: toWarehouse.branch_uuid,
      to_branch_name: toBranch.name,
      serial_no: purchase_entry.serial_no,
    })
    .from(internal_transfer)
    .leftJoin(floor, eq(internal_transfer.floor_uuid, floor.uuid))
    .leftJoin(box, eq(internal_transfer.box_uuid, box.uuid))
    .leftJoin(
      users,
      eq(internal_transfer.created_by, users.uuid),
    )
    .leftJoin(rack, eq(internal_transfer.rack_uuid, rack.uuid))
    .leftJoin(
      fromWarehouse,
      eq(internal_transfer.from_warehouse_uuid, fromWarehouse.uuid),
    )
    .leftJoin(
      toWarehouse,
      eq(internal_transfer.to_warehouse_uuid, toWarehouse.uuid),
    )
    .leftJoin(purchase_entry, eq(internal_transfer.purchase_entry_uuid, purchase_entry.uuid))
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(fromBranch, eq(fromWarehouse.branch_uuid, fromBranch.uuid))
    .leftJoin(toBranch, eq(toWarehouse.branch_uuid, toBranch.uuid))
    .orderBy(desc(internal_transfer.created_at));

  const data = await internalTransferPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const internalTransferPromise = db
    .select({
      uuid: internal_transfer.uuid,
      id: internal_transfer.id,
      internal_transfer_id: sql`CONCAT(
                'SIT',
                TO_CHAR(${internal_transfer.created_at}, 'YY'),
                ' - ',
                ${internal_transfer.id}
            )`,
      purchase_entry_uuid: internal_transfer.purchase_entry_uuid,
      product_uuid: purchase_entry.product_uuid,
      product_name: product.title,
      rack_uuid: internal_transfer.rack_uuid,
      rack_name: rack.name,
      floor_uuid: internal_transfer.floor_uuid,
      floor_name: floor.name,
      box_uuid: internal_transfer.box_uuid,
      box_name: box.name,
      quantity: PG_DECIMAL_TO_FLOAT(internal_transfer.quantity),
      created_by: internal_transfer.created_by,
      created_by_name: users.name,
      created_at: internal_transfer.created_at,
      updated_at: internal_transfer.updated_at,
      remarks: internal_transfer.remarks,
      from_warehouse_uuid: internal_transfer.from_warehouse_uuid,
      from_warehouse_name: fromWarehouse.name,
      // from_warehouse: PG_DECIMAL_TO_FLOAT(
      //   sql`CASE WHEN ${
      //     fromWarehouse.assigned
      //   } ='warehouse_1' THEN ${product.warehouse_1} WHEN ${
      //     fromWarehouse.assigned
      //   } = 'warehouse_2' THEN ${product.warehouse_2} ELSE ${product.warehouse_3} END`,
      // ),
      // from_warehouse: sql`(CASE
      //   WHEN ${fromWarehouse.assigned} = 'warehouse_1' THEN COALESCE(${
      //     product.warehouse_1
      //   }, 0)
      //   WHEN ${fromWarehouse.assigned} = 'warehouse_2' THEN COALESCE(${
      //     product.warehouse_2
      //   }, 0)
      //   ELSE COALESCE(${product.warehouse_3}, 0)
      // END)::float8`,
      to_warehouse_uuid: internal_transfer.to_warehouse_uuid,
      to_warehouse_name: toWarehouse.name,
      // to_warehouse: PG_DECIMAL_TO_FLOAT(
      //   sql`CASE WHEN ${
      //     toWarehouse.assigned
      //   } = 'warehouse_1' THEN ${product.warehouse_1} WHEN ${
      //     toWarehouse.assigned
      //   } = 'warehouse_2' THEN ${product.warehouse_2} ELSE ${product.warehouse_3} END`,
      // ),
      // to_warehouse: sql`(CASE
      //   WHEN ${toWarehouse.assigned} = 'warehouse_1' THEN COALESCE(${product.warehouse_1}, 0)
      //   WHEN ${toWarehouse.assigned} = 'warehouse_2' THEN COALESCE(${product.warehouse_2}, 0)
      //   ELSE COALESCE(${product.warehouse_3}, 0)
      // END)::float8`,
      from_branch_uuid: fromWarehouse.branch_uuid,
      from_branch_name: fromBranch.name,
      to_branch_uuid: toWarehouse.branch_uuid,
      to_branch_name: toBranch.name,
      serial_no: purchase_entry.serial_no,
    })
    .from(internal_transfer)
    .leftJoin(floor, eq(internal_transfer.floor_uuid, floor.uuid))
    .leftJoin(box, eq(internal_transfer.box_uuid, box.uuid))
    .leftJoin(
      users,
      eq(internal_transfer.created_by, users.uuid),
    )
    .leftJoin(rack, eq(internal_transfer.rack_uuid, rack.uuid))
    .leftJoin(
      fromWarehouse,
      eq(internal_transfer.from_warehouse_uuid, fromWarehouse.uuid),
    )
    .leftJoin(
      toWarehouse,
      eq(internal_transfer.to_warehouse_uuid, toWarehouse.uuid),
    )
    .leftJoin(purchase_entry, eq(internal_transfer.purchase_entry_uuid, purchase_entry.uuid))
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(fromBranch, eq(fromWarehouse.branch_uuid, fromBranch.uuid))
    .leftJoin(toBranch, eq(toWarehouse.branch_uuid, toBranch.uuid))
    .where(eq(internal_transfer.uuid, uuid));

  const [data] = await internalTransferPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
