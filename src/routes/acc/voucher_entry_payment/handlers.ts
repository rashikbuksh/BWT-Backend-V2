import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { voucher, voucher_entry, voucher_entry_payment } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(voucher_entry_payment).values(value).returning({
    name: voucher_entry_payment.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(voucher_entry_payment)
    .set(updates)
    .where(eq(voucher_entry_payment.uuid, uuid))
    .returning({
      name: voucher_entry_payment.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(voucher_entry_payment)
    .where(eq(voucher_entry_payment.uuid, uuid))
    .returning({
      name: voucher_entry_payment.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const voucher_entry_paymentPromise = db
    .select({
      uuid: voucher_entry_payment.uuid,
      index: voucher_entry_payment.index,
      voucher_entry_uuid: voucher_entry_payment.voucher_entry_uuid,
      voucher_uuid: voucher_entry.voucher_uuid,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      payment_type: voucher_entry_payment.payment_type,
      trx_no: voucher_entry_payment.trx_no,
      amount: PG_DECIMAL_TO_FLOAT(voucher_entry_payment.amount),
      date: voucher_entry_payment.date,
      created_by: voucher_entry_payment.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher_entry_payment.created_at,
      updated_by: voucher_entry_payment.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher_entry_payment.updated_at,
      remarks: voucher_entry_payment.remarks,
    })
    .from(voucher_entry_payment)
    .leftJoin(voucher_entry, eq(voucher_entry.uuid, voucher_entry_payment.voucher_entry_uuid))
    .leftJoin(voucher, eq(voucher.uuid, voucher_entry.voucher_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher_entry_payment.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher_entry_payment.updated_by))
    .orderBy(desc(voucher_entry_payment.created_at));

  const data = await voucher_entry_paymentPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const voucher_entry_paymentPromise = db
    .select({
      uuid: voucher_entry_payment.uuid,
      index: voucher_entry_payment.index,
      voucher_entry_uuid: voucher_entry_payment.voucher_entry_uuid,
      voucher_uuid: voucher_entry.voucher_uuid,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      payment_type: voucher_entry_payment.payment_type,
      trx_no: voucher_entry_payment.trx_no,
      amount: PG_DECIMAL_TO_FLOAT(voucher_entry_payment.amount),
      date: voucher_entry_payment.date,
      created_by: voucher_entry_payment.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher_entry_payment.created_at,
      updated_by: voucher_entry_payment.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher_entry_payment.updated_at,
      remarks: voucher_entry_payment.remarks,
    })
    .from(voucher_entry_payment)
    .leftJoin(voucher_entry, eq(voucher_entry.uuid, voucher_entry_payment.voucher_entry_uuid))
    .leftJoin(voucher, eq(voucher.uuid, voucher_entry.voucher_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher_entry_payment.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher_entry_payment.updated_by))
    .where(eq(voucher_entry_payment.uuid, uuid));

  const [data] = await voucher_entry_paymentPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
