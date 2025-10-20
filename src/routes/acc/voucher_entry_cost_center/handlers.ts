import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { cost_center, voucher, voucher_entry, voucher_entry_cost_center } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(voucher_entry_cost_center).values(value).returning({
    name: voucher_entry_cost_center.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(voucher_entry_cost_center)
    .set(updates)
    .where(eq(voucher_entry_cost_center.uuid, uuid))
    .returning({
      name: voucher_entry_cost_center.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(voucher_entry_cost_center)
    .where(eq(voucher_entry_cost_center.uuid, uuid))
    .returning({
      name: voucher_entry_cost_center.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const voucher_entry_cost_centerPromise = db
    .select({
      uuid: voucher_entry_cost_center.uuid,
      voucher_entry_uuid: voucher_entry_cost_center.voucher_entry_uuid,
      voucher_uuid: voucher.uuid,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      index: voucher_entry_cost_center.index,
      cost_center_uuid: voucher_entry_cost_center.cost_center_uuid,
      cost_center_name: cost_center.name,
      amount: voucher_entry_cost_center.amount,
      created_by: voucher_entry_cost_center.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher_entry_cost_center.created_at,
      updated_by: voucher_entry_cost_center.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher_entry_cost_center.updated_at,
      remarks: voucher_entry_cost_center.remarks,
    })
    .from(voucher_entry_cost_center)
    .leftJoin(voucher_entry, eq(voucher_entry.uuid, voucher_entry_cost_center.voucher_entry_uuid))
    .leftJoin(voucher, eq(voucher.uuid, voucher_entry.voucher_uuid))
    .leftJoin(cost_center, eq(cost_center.uuid, voucher_entry_cost_center.cost_center_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher_entry_cost_center.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher_entry_cost_center.updated_by))
    .orderBy(desc(voucher_entry_cost_center.created_at));

  const data = await voucher_entry_cost_centerPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const voucher_entry_cost_centerPromise = db
    .select({
      uuid: voucher_entry_cost_center.uuid,
      voucher_entry_uuid: voucher_entry_cost_center.voucher_entry_uuid,
      voucher_uuid: voucher.uuid,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      index: voucher_entry_cost_center.index,
      cost_center_uuid: voucher_entry_cost_center.cost_center_uuid,
      cost_center_name: cost_center.name,
      amount: voucher_entry_cost_center.amount,
      created_by: voucher_entry_cost_center.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher_entry_cost_center.created_at,
      updated_by: voucher_entry_cost_center.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher_entry_cost_center.updated_at,
      remarks: voucher_entry_cost_center.remarks,
    })
    .from(voucher_entry_cost_center)
    .leftJoin(voucher_entry, eq(voucher_entry.uuid, voucher_entry_cost_center.voucher_entry_uuid))
    .leftJoin(voucher, eq(voucher.uuid, voucher_entry.voucher_uuid))
    .leftJoin(cost_center, eq(cost_center.uuid, voucher_entry_cost_center.cost_center_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher_entry_cost_center.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher_entry_cost_center.updated_by))
    .where(eq(voucher_entry_cost_center.uuid, uuid));

  const [data] = await voucher_entry_cost_centerPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
