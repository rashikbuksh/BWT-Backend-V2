import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { box, floor, internal_transfer, product, rack, warehouse } from '../schema';

const from_warehouse = alias(warehouse, 'from_warehouse');
const to_warehouse = alias(warehouse, 'to_warehouse');

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
  const resultPromise = db.select({
    uuid: internal_transfer.uuid,
    id: internal_transfer.id,
    product_uuid: internal_transfer.product_uuid,
    product_name: product.name,
    from_warehouse_uuid: internal_transfer.from_warehouse_uuid,
    from_warehouse_name: from_warehouse.name,
    to_warehouse_uuid: internal_transfer.to_warehouse_uuid,
    to_warehouse_name: to_warehouse.name,
    rack_uuid: internal_transfer.rack_uuid,
    rack_name: rack.name,
    floor_uuid: internal_transfer.floor_uuid,
    floor_name: floor.name,
    box_uuid: internal_transfer.box_uuid,
    box_name: box.name,
    quantity: internal_transfer.quantity,
    created_by: internal_transfer.created_by,
    created_by_name: users.name,
    created_at: internal_transfer.created_at,
    updated_at: internal_transfer.updated_at,
    remarks: internal_transfer.remarks,
  })
    .from(internal_transfer)
    .leftJoin(users, eq(internal_transfer.created_by, users.uuid))
    .leftJoin(product, eq(internal_transfer.product_uuid, product.uuid))
    .leftJoin(from_warehouse, eq(internal_transfer.from_warehouse_uuid, from_warehouse.uuid))
    .leftJoin(to_warehouse, eq(internal_transfer.to_warehouse_uuid, to_warehouse.uuid))
    .leftJoin(rack, eq(internal_transfer.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(internal_transfer.floor_uuid, floor.uuid))
    .leftJoin(box, eq(internal_transfer.box_uuid, box.uuid))
    .orderBy(desc(internal_transfer.created_at));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: internal_transfer.uuid,
    id: internal_transfer.id,
    product_uuid: internal_transfer.product_uuid,
    product_name: product.name,
    from_warehouse_uuid: internal_transfer.from_warehouse_uuid,
    from_warehouse_name: from_warehouse.name,
    to_warehouse_uuid: internal_transfer.to_warehouse_uuid,
    to_warehouse_name: to_warehouse.name,
    rack_uuid: internal_transfer.rack_uuid,
    rack_name: rack.name,
    floor_uuid: internal_transfer.floor_uuid,
    floor_name: floor.name,
    box_uuid: internal_transfer.box_uuid,
    box_name: box.name,
    quantity: internal_transfer.quantity,
    created_by: internal_transfer.created_by,
    created_by_name: users.name,
    created_at: internal_transfer.created_at,
    updated_at: internal_transfer.updated_at,
    remarks: internal_transfer.remarks,
  })
    .from(internal_transfer)
    .leftJoin(users, eq(internal_transfer.created_by, users.uuid))
    .leftJoin(product, eq(internal_transfer.product_uuid, product.uuid))
    .leftJoin(from_warehouse, eq(internal_transfer.from_warehouse_uuid, from_warehouse.uuid))
    .leftJoin(to_warehouse, eq(internal_transfer.to_warehouse_uuid, to_warehouse.uuid))
    .leftJoin(rack, eq(internal_transfer.rack_uuid, rack.uuid))
    .leftJoin(floor, eq(internal_transfer.floor_uuid, floor.uuid))
    .leftJoin(box, eq(internal_transfer.box_uuid, box.uuid))
    .where(eq(internal_transfer.uuid, uuid));

  const data = await resultPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
