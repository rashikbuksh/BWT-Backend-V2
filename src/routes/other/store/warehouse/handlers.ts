import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { branch, purchase_entry, warehouse } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { branch_uuid, purchase_uuid } = c.req.valid('query');
  const warehousePromise = db.select({
    value: warehouse.uuid,
    label: sql`CONCAT( ${warehouse.name}, '(', ${branch.name}, ')' )`,
    assigned: warehouse.assigned,
    warehouse_name: warehouse.name,
    branch_name: branch.name,
  })
    .from(warehouse)
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid));

  if (branch_uuid) {
    warehousePromise.where(
      eq(warehouse.branch_uuid, branch_uuid),
    );
  }

  if (purchase_uuid) {
    warehousePromise
      .leftJoin(
        purchase_entry,
        eq(
          warehouse.uuid,
          purchase_entry.warehouse_uuid,
        ),
      )
      .where(eq(purchase_entry.uuid, purchase_uuid));
  }

  const data = await warehousePromise;

  return c.json(data, HSCode.OK);
};
