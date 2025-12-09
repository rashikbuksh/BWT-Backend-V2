import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { cost_center, ledger } from '@/routes/acc/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { ledger_uuid } = c.req.valid('query');

  const cost_centerPromise = db.select({
    value: cost_center.uuid,
    label: sql`CASE
          WHEN ${ledger.identifier} IS NOT NULL AND ${ledger.identifier} != 'none'
            THEN CONCAT(${cost_center.name}, ' - ', COALESCE((SELECT CONCAT('SP',TO_CHAR(ip.created_at, 'YY'),' - ',ip.id) FROM inventory.purchase ip WHERE ip.uuid = ${cost_center.table_uuid}), ''))
          ELSE ${cost_center.name}
        END`,
    invoice_no: cost_center.invoice_no,
    identifier: ledger.identifier,
    ledger_uuid: cost_center.ledger_uuid,
  })
    .from(cost_center)
    .leftJoin(
      ledger,
      eq(cost_center.ledger_uuid, ledger.uuid),
    );

  const filters = [];

  if (ledger_uuid) {
    filters.push(
      eq(cost_center.ledger_uuid, ledger_uuid),
    );
  }

  if (filters.length > 0) {
    cost_centerPromise.where(and(...filters));
  }

  const data = await cost_centerPromise;

  return c.json(data || [], HSCode.OK);
};
