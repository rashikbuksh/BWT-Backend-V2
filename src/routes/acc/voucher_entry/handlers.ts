import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByVoucherUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { ledger, voucher, voucher_entry } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(voucher_entry).values(value).returning({
    name: voucher_entry.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(voucher_entry)
    .set(updates)
    .where(eq(voucher_entry.uuid, uuid))
    .returning({
      name: voucher_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(voucher_entry)
    .where(eq(voucher_entry.uuid, uuid))
    .returning({
      name: voucher_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const voucher_entryPromise = db
    .select({
      uuid: voucher_entry.uuid,
      voucher_uuid: voucher_entry.voucher_uuid,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      index: voucher_entry.index,
      ledger_uuid: voucher_entry.ledger_uuid,
      ledger_name: ledger.name,
      type: voucher_entry.type,
      amount: PG_DECIMAL_TO_FLOAT(voucher_entry.amount),
      is_need_cost_center: voucher_entry.is_need_cost_center,
      is_payment: voucher_entry.is_payment,
      description: voucher_entry.description,
      created_by: voucher_entry.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher_entry.created_at,
      updated_by: voucher_entry.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher_entry.updated_at,
      remarks: voucher_entry.remarks,
    })
    .from(voucher_entry)
    .leftJoin(voucher, eq(voucher.uuid, voucher_entry.voucher_uuid))
    .leftJoin(ledger, eq(ledger.uuid, voucher_entry.ledger_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher_entry.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher_entry.updated_by))
    .orderBy(desc(voucher_entry.created_at));

  const data = await voucher_entryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const voucher_entryPromise = db
    .select({
      uuid: voucher_entry.uuid,
      voucher_uuid: voucher_entry.voucher_uuid,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      index: voucher_entry.index,
      ledger_uuid: voucher_entry.ledger_uuid,
      ledger_name: ledger.name,
      type: voucher_entry.type,
      amount: PG_DECIMAL_TO_FLOAT(voucher_entry.amount),
      is_need_cost_center: voucher_entry.is_need_cost_center,
      is_payment: voucher_entry.is_payment,
      description: voucher_entry.description,
      created_by: voucher_entry.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher_entry.created_at,
      updated_by: voucher_entry.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher_entry.updated_at,
      remarks: voucher_entry.remarks,
    })
    .from(voucher_entry)
    .leftJoin(voucher, eq(voucher.uuid, voucher_entry.voucher_uuid))
    .leftJoin(ledger, eq(ledger.uuid, voucher_entry.ledger_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher_entry.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher_entry.updated_by))
    .where(eq(voucher_entry.uuid, uuid));

  const [data] = await voucher_entryPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByVoucherUuid: AppRouteHandler<GetByVoucherUuidRoute> = async (c: any) => {
  const { voucher_uuid } = c.req.valid('param');

  const voucher_entryPromise = db
    .select({
      uuid: voucher_entry.uuid,
      voucher_uuid: voucher_entry.voucher_uuid,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      index: voucher_entry.index,
      ledger_uuid: voucher_entry.ledger_uuid,
      ledger_name: ledger.name,
      type: voucher_entry.type,
      amount: PG_DECIMAL_TO_FLOAT(voucher_entry.amount),
      is_need_cost_center: voucher_entry.is_need_cost_center,
      is_payment: voucher_entry.is_payment,
      description: voucher_entry.description,
      created_by: voucher_entry.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher_entry.created_at,
      updated_by: voucher_entry.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher_entry.updated_at,
      remarks: voucher_entry.remarks,
      voucher_entry_cost_center: sql`(
        SELECT COALESCE(JSON_AGG(
          JSON_BUILD_OBJECT(
            'uuid', vecc.uuid,
            'cost_center_uuid', vecc.cost_center_uuid,
            'cost_center_name', cc.name,
            'amount', vecc.amount::float8,
            'created_by', vecc.created_by,
            'created_by_name', cbu.name,
            'created_at', vecc.created_at,
            'updated_by', vecc.updated_by,
            'updated_by_name', ubu.name,
            'updated_at', vecc.updated_at,
            'remarks', vecc.remarks
          )
        ), '[]'::JSON)
        FROM acc.voucher_entry_cost_center AS vecc
        LEFT JOIN acc.cost_center AS cc ON cc.uuid = vecc.cost_center_uuid
        LEFT JOIN hr.users AS cbu ON cbu.uuid = vecc.created_by
        LEFT JOIN hr.users AS ubu ON ubu.uuid = vecc.updated_by
        WHERE vecc.voucher_entry_uuid = ${voucher_entry.uuid}
      )`,
      voucher_entry_payment: sql`(
        SELECT COALESCE(JSON_AGG(
          JSON_BUILD_OBJECT(
            'uuid', vep.uuid,
            'payment_type', vep.payment_type,
            'trx_no', vep.trx_no,
            'amount', vep.amount::float8,
            'date', vep.date,
            'created_by', vep.created_by,
            'created_by_name', cbu.name,
            'created_at', vep.created_at,
            'updated_by', vep.updated_by,
            'updated_by_name', ubu.name,
            'updated_at', vep.updated_at,
            'remarks', vep.remarks
          )
        ), '[]'::JSON)
        FROM acc.voucher_entry_payment AS vep
        LEFT JOIN hr.users AS cbu ON cbu.uuid = vep.created_by
        LEFT JOIN hr.users AS ubu ON ubu.uuid = vep.updated_by
        WHERE vep.voucher_entry_uuid = ${voucher_entry.uuid}
      )`,
    })
    .from(voucher_entry)
    .leftJoin(voucher, eq(voucher.uuid, voucher_entry.voucher_uuid))
    .leftJoin(ledger, eq(ledger.uuid, voucher_entry.ledger_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher_entry.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher_entry.updated_by))
    .where(eq(voucher_entry.voucher_uuid, voucher_uuid));

  const data = await voucher_entryPromise;

  return c.json(data || [], HSCode.OK);
};
