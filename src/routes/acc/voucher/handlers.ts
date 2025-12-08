import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import createApi from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute, VoucherDetailsRoute } from './routes';

import { currency, voucher, voucher_entry, voucher_entry_cost_center, voucher_entry_payment } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(voucher).values(value).returning({
    name: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
  });

  const name = String((data as any)?.name ?? '');
  return c.json(createToast('create', name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);
  const [data] = await db.update(voucher)
    .set(updates)
    .where(eq(voucher.uuid, uuid))
    .returning({
      name: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
    });

  if (!data)
    return DataNotFound(c);

  const name = String((data as any).name ?? '');
  return c.json(createToast('update', name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const getVoucherEntriesPromise = db
    .select()
    .from(voucher_entry)
    .where(eq(voucher_entry.voucher_uuid, uuid));

  // First, delete related voucher entries like voucher payments and voucher cost centers
  await getVoucherEntriesPromise.then(async (voucherEntries) => {
    for (const entry of voucherEntries) {
      // Delete voucher payments related to this voucher entry
      await db
        .delete(voucher_entry_payment)
        .where(
          eq(voucher_entry_payment.voucher_entry_uuid, entry.uuid),
        );
      // Delete voucher cost centers related to this voucher entry
      await db
        .delete(voucher_entry_cost_center)
        .where(
          eq(voucher_entry_cost_center.voucher_entry_uuid, entry.uuid),
        );
    }
  });

  // Then, delete the voucher entries themselves
  await db
    .delete(voucher_entry)
    .where(eq(voucher_entry.voucher_uuid, uuid));

  const [data] = await db.delete(voucher)
    .where(eq(voucher.uuid, uuid))
    .returning({
      name: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
    });

  if (!data)
    return DataNotFound(c);

  const name = String((data as any).name ?? '');
  return c.json(createToast('delete', name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const voucherPromise = db
    .select({
      uuid: voucher.uuid,
      id: voucher.id,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      date: voucher.date,
      conversion_rate: PG_DECIMAL_TO_FLOAT(voucher.conversion_rate),
      vat_deduction: PG_DECIMAL_TO_FLOAT(voucher.vat_deduction),
      tax_deduction: PG_DECIMAL_TO_FLOAT(voucher.tax_deduction),
      category: voucher.category,
      narration: voucher.narration,
      currency_uuid: voucher.currency_uuid,
      currency_name: currency.currency_name,
      currency_symbol: currency.symbol,
      created_by: voucher.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher.created_at,
      updated_by: voucher.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher.updated_at,
      remarks: voucher.remarks,
      dr_ledgers: sql`COALESCE(voucher_agg.dr_ledgers, ARRAY[]::text[])`,
      cr_ledgers: sql`COALESCE(voucher_agg.cr_ledgers, ARRAY[]::text[])`,
      amount: sql`COALESCE(voucher_agg.amount, 0)`,
    })
    .from(voucher)
    .leftJoin(currency, eq(currency.uuid, voucher.currency_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher.updated_by))
    .leftJoin(
      sql`(
        SELECT 
          voucher_entry.voucher_uuid, 
          array_agg(ledger.name::text) FILTER (WHERE voucher_entry.type = 'dr') as dr_ledgers,
            array_agg(ledger.name::text) FILTER (WHERE voucher_entry.type = 'cr') as cr_ledgers,
            SUM(
            CASE WHEN voucher_entry.type = 'dr' THEN voucher_entry.amount ELSE 0 END
          ) as amount
        FROM acc.voucher_entry
        LEFT JOIN acc.ledger ON voucher_entry.ledger_uuid = ledger.uuid
        GROUP BY voucher_entry.voucher_uuid
      ) as voucher_agg`,
      eq(voucher.uuid, sql`voucher_agg.voucher_uuid`),
    )
    .orderBy(desc(voucher.created_at));

  const data = await voucherPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const voucherPromise = db
    .select({
      uuid: voucher.uuid,
      id: voucher.id,
      voucher_id: sql`CONCAT('VO', TO_CHAR(${voucher.created_at}::timestamp, 'YY'), '-', ${voucher.id})`,
      date: voucher.date,
      conversion_rate: PG_DECIMAL_TO_FLOAT(voucher.conversion_rate),
      vat_deduction: PG_DECIMAL_TO_FLOAT(voucher.vat_deduction),
      tax_deduction: PG_DECIMAL_TO_FLOAT(voucher.tax_deduction),
      category: voucher.category,
      narration: voucher.narration,
      currency_uuid: voucher.currency_uuid,
      currency_name: currency.currency_name,
      currency_symbol: currency.symbol,
      created_by: voucher.created_by,
      created_by_name: createdByUser.name,
      created_at: voucher.created_at,
      updated_by: voucher.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: voucher.updated_at,
      remarks: voucher.remarks,
    })
    .from(voucher)
    .leftJoin(currency, eq(currency.uuid, voucher.currency_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, voucher.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, voucher.updated_by))
    .where(eq(voucher.uuid, uuid));

  const [data] = await voucherPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const voucherDetails: AppRouteHandler<VoucherDetailsRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const api = createApi(c);
  // Fetch voucher details

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [voucher, voucher_entry] = await Promise.all([
    fetchData(`/v1/acc/voucher/${uuid}`),
    fetchData(`/v1/acc/voucher-entry/by/${uuid}`),
  ]);

  const response = {
    ...(voucher?.data || voucher || {}),
    voucher_entry: voucher_entry?.data || voucher_entry || [],
  };

  return c.json(response || [], HSCode.OK);
};
