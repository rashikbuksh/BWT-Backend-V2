import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { group, ledger } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(ledger).values(value).returning({
    name: ledger.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(ledger)
    .set(updates)
    .where(eq(ledger.uuid, uuid))
    .returning({
      name: ledger.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(ledger)
    .where(eq(ledger.uuid, uuid))
    .returning({
      name: ledger.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const ledgerPromise = db
    .select({
      uuid: ledger.uuid,
      id: ledger.id,
      ledger_id: sql`CONCAT('CH', TO_CHAR(${ledger.created_at}::timestamp, 'YY'), '-', ${ledger.id})`,
      name: ledger.name,
      table_name: ledger.table_name,
      table_uuid: ledger.table_uuid,
      account_no: ledger.account_no,
      is_active: ledger.is_active,
      restrictions: ledger.restrictions,
      group_uuid: ledger.group_uuid,
      group_name: group.name,
      vat_deduction: ledger.vat_deduction,
      tax_deduction: ledger.tax_deduction,
      old_ledger_id: ledger.old_ledger_id,
      created_by: ledger.created_by,
      created_by_name: createdByUser.name,
      created_at: ledger.created_at,
      updated_by: ledger.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: ledger.updated_at,
      remarks: ledger.remarks,
      narration: ledger.narration,
      is_bank_ledger: ledger.is_bank_ledger,
      is_cash_ledger: ledger.is_cash_ledger,
      identifier: ledger.identifier,
      initial_amount: ledger.initial_amount,
      group_number: ledger.group_number,
      index: ledger.index,
    })
    .from(ledger)
    .leftJoin(group, eq(group.uuid, ledger.group_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, ledger.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, ledger.updated_by))
    .orderBy(desc(ledger.created_at));

  const data = await ledgerPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const ledgerPromise = db
    .select({
      uuid: ledger.uuid,
      id: ledger.id,
      ledger_id: sql`CONCAT('CH', TO_CHAR(${ledger.created_at}::timestamp, 'YY'), '-', ${ledger.id})`,
      name: ledger.name,
      table_name: ledger.table_name,
      table_uuid: ledger.table_uuid,
      account_no: ledger.account_no,
      is_active: ledger.is_active,
      restrictions: ledger.restrictions,
      group_uuid: ledger.group_uuid,
      group_name: group.name,
      vat_deduction: ledger.vat_deduction,
      tax_deduction: ledger.tax_deduction,
      old_ledger_id: ledger.old_ledger_id,
      created_by: ledger.created_by,
      created_by_name: createdByUser.name,
      created_at: ledger.created_at,
      updated_by: ledger.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: ledger.updated_at,
      remarks: ledger.remarks,
      narration: ledger.narration,
      is_bank_ledger: ledger.is_bank_ledger,
      is_cash_ledger: ledger.is_cash_ledger,
      identifier: ledger.identifier,
      initial_amount: ledger.initial_amount,
      group_number: ledger.group_number,
      index: ledger.index,
    })
    .from(ledger)
    .leftJoin(group, eq(group.uuid, ledger.group_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, ledger.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, ledger.updated_by))
    .where(eq(ledger.uuid, uuid));

  const [data] = await ledgerPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
