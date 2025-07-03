import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { box, floor, purchase, purchase_entry, rack, warehouse } from '../schema';

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
  const resultPromise = db.select({
    uuid: purchase_entry.uuid,
    purchase_uuid: purchase.uuid,
    purchase_id: purchase.id,
    serial_no: purchase_entry.serial_no,
    quantity: purchase_entry.quantity,
    price_per_unit: purchase_entry.price_per_unit,
    discount: purchase_entry.discount,
    warehouse_uuid: warehouse.uuid,
    warehouse_name: warehouse.name,
    rack_uuid: rack.uuid,
    rack_name: rack.name,
    floor_uuid: floor.uuid,
    floor_name: floor.name,
    box_uuid: box.uuid,
    box_name: box.name,
    created_by: purchase_entry.created_by,
    created_by_name: users.name,
    created_at: purchase_entry.created_at,
    updated_at: purchase_entry.updated_at,
    remarks: purchase_entry.remarks,
  })
    .from(purchase_entry)
    .leftJoin(users, eq(purchase_entry.created_by, users.uuid))
    .leftJoin(purchase, eq(purchase_entry.purchase_uuid, purchase.uuid))
    .leftJoin(warehouse, eq(purchase_entry.warehouse_uuid, warehouse.uuid))
    .leftJoin(rack, eq(purchase_entry.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(purchase_entry.floor_uuid, floor.uuid))
    .leftJoin(box, eq(purchase_entry.box_uuid, box.uuid))
    .orderBy(desc(purchase_entry.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: purchase_entry.uuid,
    purchase_uuid: purchase.uuid,
    purchase_id: purchase.id,
    serial_no: purchase_entry.serial_no,
    quantity: purchase_entry.quantity,
    price_per_unit: purchase_entry.price_per_unit,
    discount: purchase_entry.discount,
    warehouse_uuid: warehouse.uuid,
    warehouse_name: warehouse.name,
    rack_uuid: rack.uuid,
    rack_name: rack.name,
    floor_uuid: floor.uuid,
    floor_name: floor.name,
    box_uuid: box.uuid,
    box_name: box.name,
    created_by: purchase_entry.created_by,
    created_by_name: users.name,
    created_at: purchase_entry.created_at,
    updated_at: purchase_entry.updated_at,
    remarks: purchase_entry.remarks,
  })
    .from(purchase_entry)
    .leftJoin(users, eq(purchase_entry.created_by, users.uuid))
    .leftJoin(purchase, eq(purchase_entry.purchase_uuid, purchase.uuid))
    .leftJoin(warehouse, eq(purchase_entry.warehouse_uuid, warehouse.uuid))
    .leftJoin(rack, eq(purchase_entry.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(purchase_entry.floor_uuid, floor.uuid))
    .leftJoin(box, eq(purchase_entry.box_uuid, box.uuid))
    .where(eq(purchase_entry.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
