import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { product, product_transfer, purchase_entry, purchase_return_entry } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { is_purchase_return_entry, warehouse_uuid, purchase_uuid, is_product_transfer } = c.req.valid('query');

  let purchaseEntryPromise = db
    .select({
      value: purchase_entry.uuid,
      label: sql`CONCAT( ${product.name}, ' - ', ${purchase_entry.serial_no})`,
    })
    .from(purchase_entry)
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(purchase_return_entry, eq(purchase_entry.uuid, purchase_return_entry.purchase_entry_uuid))
    .leftJoin(product_transfer, eq(purchase_entry.uuid, product_transfer.purchase_entry_uuid));

  const filters = [];

  if (is_purchase_return_entry === 'false') {
    filters.push(
      sql`${purchase_return_entry.purchase_entry_uuid} IS NULL`,
    );
  }
  if (is_product_transfer === 'false') {
    filters.push(
      sql`${product_transfer.purchase_entry_uuid} IS NULL`,
    );
  }
  if (warehouse_uuid) {
    // Get latest internal transfers using window function
    const latestInternalTransfers = await db.execute(sql`
                    WITH latest_transfers AS (
                      SELECT 
                        purchase_entry_uuid,
                        to_warehouse_uuid,
                        created_at,
                        ROW_NUMBER() OVER (PARTITION BY purchase_entry_uuid ORDER BY created_at DESC) as rn
                      FROM internal_transfer
                    )
                    SELECT purchase_entry_uuid 
                    FROM latest_transfers 
                    WHERE rn = 1 AND to_warehouse_uuid = ${warehouse_uuid}`);

    const transferredPurchaseEntryUuids = latestInternalTransfers.rows.map(
      (row: any) => row.purchase_entry_uuid,
    );

    if (transferredPurchaseEntryUuids.length > 0) {
    // Include entries from internal transfers OR entries from purchase_entry table not in internal_transfer
      filters.push(
        sql`(${purchase_entry.uuid} IN ${transferredPurchaseEntryUuids} OR 
           (${purchase_entry.warehouse_uuid} = ${warehouse_uuid} AND 
            ${purchase_entry.uuid} NOT IN (SELECT DISTINCT purchase_entry_uuid FROM store.internal_transfer WHERE purchase_entry_uuid IS NOT NULL)))`,
      );
    }
    else {
    // No internal transfers found, just filter by warehouse_uuid from purchase_entry
      filters.push(
        sql`${purchase_entry.warehouse_uuid} = ${warehouse_uuid} AND 
          ${purchase_entry.uuid} NOT IN (SELECT DISTINCT purchase_entry_uuid FROM store.internal_transfer WHERE purchase_entry_uuid IS NOT NULL)`,
      );
    }
  }
  if (purchase_uuid) {
    filters.push(
      eq(purchase_entry.purchase_uuid, purchase_uuid),
    );
  }

  if (filters.length > 0) {
    purchaseEntryPromise = (purchaseEntryPromise as any).where(and(...filters));
  }

  const data = await purchaseEntryPromise;

  return c.json(data, HSCode.OK);
};
