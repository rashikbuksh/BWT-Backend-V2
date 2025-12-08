import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { group, ledger } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const { updated_by, updated_at, id, ...createValue } = value;

  const [data] = await db.insert(ledger).values(createValue).returning({
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
      vat_deduction: PG_DECIMAL_TO_FLOAT(ledger.vat_deduction),
      tax_deduction: PG_DECIMAL_TO_FLOAT(ledger.tax_deduction),
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
      initial_amount: PG_DECIMAL_TO_FLOAT(ledger.initial_amount),
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
      vat_deduction: PG_DECIMAL_TO_FLOAT(ledger.vat_deduction),
      tax_deduction: PG_DECIMAL_TO_FLOAT(ledger.tax_deduction),
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
      initial_amount: PG_DECIMAL_TO_FLOAT(ledger.initial_amount),
      group_number: ledger.group_number,
      index: ledger.index,
      vouchers: sql`
        (
          SELECT COALESCE(
                  JSONB_AGG(
                      JSONB_BUILD_OBJECT(
                          'uuid', ve.uuid, 
                          'voucher_uuid', ve.voucher_uuid, 
                          'voucher_id', CONCAT(
                              'VO', TO_CHAR(v.created_at::timestamp, 'YY'), '-', v.id
                          ), 
                          'ledger_uuid', ve.ledger_uuid, 
                          'ledger_name', l.name,
                          'category', v.category, 
                          'date', v.date,
                          'type', ve.type,
                          'amount', ve.amount
                      )
                  ), '[]'::jsonb
              )
          FROM acc.voucher_entry ve
          LEFT JOIN acc.voucher v ON ve.voucher_uuid = v.uuid
          LEFT JOIN acc.ledger l ON ve.ledger_uuid = l.uuid
          WHERE ve.ledger_uuid = ${ledger.uuid}
      )
      `.as('vouchers'),
      associated_ledgers: sql`
      (
        SELECT COALESCE(
            JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'id', id,
                'voucher_uuid', voucher_uuid, 
                'voucher_id', voucher_id, 
                'ledger_details', ledger_details, 
                'category', category, 
                'date', date,
                'amount', total_amount,
                'type', type,
                'currency_uuid', currency_uuid,
                'currency_symbol', currency_symbol,
                'conversion_rate', conversion_rate
              ) ORDER BY id DESC, date DESC
            ), '[]'::jsonb
          )
        FROM (
          SELECT 
            ve_other.voucher_uuid,
            CONCAT('VO', TO_CHAR(v.created_at::timestamp, 'YY'), '-', v.id) as voucher_id,
                        JSONB_AGG( JSONB_BUILD_OBJECT(
                            'ledger_uuid', ve_other.ledger_uuid,
                            'ledger_name', l_other.name
                        )) as ledger_details,
                        ve_main.type,
            ve_main.amount as total_amount,
            v.category,
            v.date,
            v.currency_uuid,
            currency.currency || ' (' || currency.symbol || ')' as currency_symbol,
            currency.conversion_rate,
            v.id
          FROM acc.voucher_entry ve_main
          LEFT JOIN acc.voucher v ON ve_main.voucher_uuid = v.uuid
          LEFT JOIN acc.voucher_entry ve_other ON v.uuid = ve_other.voucher_uuid AND ve_other.ledger_uuid != ve_main.ledger_uuid AND ve_main.type != ve_other.type
          LEFT JOIN acc.ledger l_other ON ve_other.ledger_uuid = l_other.uuid
          LEFT JOIN acc.currency ON v.currency_uuid = currency.uuid
          WHERE ve_main.ledger_uuid = ledger.uuid
          GROUP BY ve_other.voucher_uuid, v.created_at, v.id, v.category, v.date, ve_main.type, currency.currency, currency.symbol, v.currency_uuid, ve_main.amount, currency.conversion_rate
        ) subquery
      )`,
      total_amount: sql`${ledger.initial_amount}::float8 + (COALESCE(voucher_total.total_debit_amount, 0) - COALESCE(voucher_total.total_credit_amount, 0))::float8`,
    })
    .from(ledger)
    .leftJoin(group, eq(group.uuid, ledger.group_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, ledger.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, ledger.updated_by))
    .leftJoin(
      sql`
        (
        SELECT 
          SUM(
            CASE WHEN voucher_entry.type = 'dr' THEN voucher_entry.amount * currency.conversion_rate ELSE 0 END
          ) as total_debit_amount,
          SUM(
            CASE WHEN voucher_entry.type = 'cr' THEN voucher_entry.amount * currency.conversion_rate ELSE 0 END
          ) as total_credit_amount,
          voucher_entry.ledger_uuid
        FROM acc.voucher_entry
        LEFT JOIN acc.voucher ON voucher_entry.voucher_uuid = voucher.uuid
        LEFT JOIN acc.currency ON voucher.currency_uuid = currency.uuid
        GROUP BY voucher_entry.ledger_uuid
        ) as voucher_total
      `,
      eq(ledger.uuid, sql`voucher_total.ledger_uuid`),
    )
    .where(eq(ledger.uuid, uuid));

  const [data] = await ledgerPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data, HSCode.OK);
};
