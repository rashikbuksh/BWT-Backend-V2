import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { ledger } from '@/routes/acc/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const ledgerPromise = db.select({
    value: ledger.uuid,
    label: sql`CONCAT(${ledger.name}, ' (', ${ledger.initial_amount} ::float8 + (COALESCE(voucher_total.total_debit_amount, 0) - COALESCE(voucher_total.total_credit_amount, 0))::float8, ')', CASE WHEN ledger.is_cash_ledger = true THEN ' - Cash' ELSE ' ' END)`,
    cost_center_count: sql`COALESCE(cost_center.cost_center_count, 0)::float8`,
    is_cash_ledger: ledger.is_cash_ledger,
    identifier: ledger.identifier,
  })
    .from(ledger)
    .leftJoin(
      sql`
        (
        SELECT 
          COUNT(cost_center.uuid) as cost_center_count,
          cost_center.ledger_uuid
        FROM acc.cost_center
        GROUP BY cost_center.ledger_uuid
        ) as cost_center
         `,
      eq(ledger.uuid, sql`cost_center.ledger_uuid`),
    )
    .leftJoin(
      sql`
        (
        SELECT 
          SUM(
            CASE WHEN voucher_entry.type = 'dr' THEN voucher_entry.amount ELSE 0 END
          ) as total_debit_amount,
          SUM(
            CASE WHEN voucher_entry.type = 'cr' THEN voucher_entry.amount ELSE 0 END
          ) as total_credit_amount,
          voucher_entry.ledger_uuid
        FROM acc.voucher_entry
        GROUP BY voucher_entry.ledger_uuid
        ) as voucher_total
         `,
      eq(ledger.uuid, sql`voucher_total.ledger_uuid`),
    );

  const data = await ledgerPromise;

  return c.json(data || [], HSCode.OK);
};
