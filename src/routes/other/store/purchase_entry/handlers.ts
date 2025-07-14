import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { product, purchase_entry, purchase_return_entry } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { is_purchase_return_entry, warehouse_uuid, purchase_uuid } = c.req.query();
  const purchaseEntryPromise = db
    .select({
      value: purchase_entry.uuid,
      label: sql`CONCAT( ${product.name}, ' - ', ${purchase_entry.serial_no})`,
    })
    .from(purchase_entry)
    .leftJoin(
      product,
      eq(
        purchase_entry.product_uuid,
        product.uuid,
      ),
    )
    .leftJoin(
      purchase_return_entry,
      eq(
        purchase_entry.uuid,
        purchase_return_entry.purchase_entry_uuid,
      ),
    );

  const filters = [];

  if (is_purchase_return_entry === 'false') {
    filters.push(
      sql`${purchase_return_entry.purchase_entry_uuid} IS NULL`,
    );
  }
  if (warehouse_uuid) {
    filters.push(
      eq(purchase_entry.warehouse_uuid, warehouse_uuid),
    );
  }
  if (purchase_uuid) {
    filters.push(
      eq(purchase_entry.purchase_uuid, purchase_uuid),
    );
  }

  if (filters.length > 0) {
    purchaseEntryPromise.where(and(...filters));
  }

  const data = await purchaseEntryPromise;

  return c.json(data, HSCode.OK);
};
