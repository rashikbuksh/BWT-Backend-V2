import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { product, product_transfer, purchase_entry, purchase_return_entry } from '@/routes/inventory/schema';
import { warehouse } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { warehouse_uuid, purchase_uuid, is_warehouse } = c.req.valid('query');

  let purchaseEntryPromise = db
    .select({
      value: purchase_entry.uuid,
      label: sql`CONCAT( ${product.name}, ' - ', ${purchase_entry.serial_no})`,
      max_trf_quantity: sql`${purchase_entry.quantity} - COALESCE(${purchase_return_entry.quantity}, 0) - COALESCE(${purchase_entry.provided_quantity}, 0)::float8`,
      // warehouse_uuid: purchase_entry.warehouse_uuid,
      // warehouse_name: warehouse.name,
    })
    .from(purchase_entry)
    .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
    .leftJoin(purchase_return_entry, eq(purchase_entry.uuid, purchase_return_entry.purchase_entry_uuid))
    .leftJoin(product_transfer, eq(purchase_entry.uuid, product_transfer.purchase_entry_uuid));
    // .leftJoin(warehouse, eq(purchase_entry.warehouse_uuid, warehouse.uuid));

  const filters = [];

  filters.push(
    sql`
      (${purchase_return_entry.quantity} IS NULL 
      OR ${purchase_return_entry.quantity} < ${purchase_entry.quantity}) 
      AND (${purchase_entry.quantity} - COALESCE(${purchase_return_entry.quantity}, 0) - COALESCE(${purchase_entry.provided_quantity}, 0)) > 0
    `,
  );

  if (warehouse_uuid) {
    // Get latest internal transfers using window function
    const latestInternalTransfers = await db.execute(sql`
                    WITH latest_transfers AS (
                      SELECT 
                        purchase_entry_uuid,
                        to_warehouse_uuid,
                        created_at,
                        ROW_NUMBER() OVER (PARTITION BY purchase_entry_uuid ORDER BY created_at DESC) as rn
                      FROM inventory.internal_transfer
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
            ${purchase_entry.uuid} NOT IN (SELECT DISTINCT purchase_entry_uuid FROM inventory.internal_transfer WHERE purchase_entry_uuid IS NOT NULL)))`,
      );
    }
    else {
    // No internal transfers found, just filter by warehouse_uuid from purchase_entry
      filters.push(
        sql`${purchase_entry.warehouse_uuid} = ${warehouse_uuid} AND 
          ${purchase_entry.uuid} NOT IN (SELECT DISTINCT purchase_entry_uuid FROM inventory.internal_transfer WHERE purchase_entry_uuid IS NOT NULL)`,
      );
    }
  }
  if (is_warehouse === 'true') {
    // Get latest internal transfers using window function
    const latestInternalTransfers = await db.execute(sql`
                    WITH latest_transfers AS (
                      SELECT 
                        purchase_entry_uuid,
                        to_warehouse_uuid,
                        created_at,
                        ROW_NUMBER() OVER (PARTITION BY purchase_entry_uuid ORDER BY created_at DESC) as rn
                      FROM inventory.internal_transfer
                    )
                    SELECT purchase_entry_uuid 
                    FROM latest_transfers 
                    WHERE rn = 1 `);

    const transferredPurchaseEntryUuids = latestInternalTransfers.rows.map(
      (row: any) => row.purchase_entry_uuid,
    );

    if (transferredPurchaseEntryUuids.length > 0) {
      purchaseEntryPromise = db
        .select({
          value: purchase_entry.uuid,
          label: sql`CONCAT( ${product.name}, ' - ', ${purchase_entry.serial_no})`,
          warehouse_uuid: sql`COALESCE(transfer_warehouse.uuid, ${purchase_entry.warehouse_uuid})`,
          warehouse_name: sql`COALESCE(transfer_warehouse.name, ${warehouse.name})`,
        })
        .from(purchase_entry)
        .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid))
        .leftJoin(purchase_return_entry, eq(purchase_entry.uuid, purchase_return_entry.purchase_entry_uuid))
        .leftJoin(product_transfer, eq(purchase_entry.uuid, product_transfer.purchase_entry_uuid))
        .leftJoin(warehouse, eq(purchase_entry.warehouse_uuid, warehouse.uuid))
        .leftJoin(
          sql`(
            WITH latest_transfers AS (
              SELECT 
                purchase_entry_uuid,
                to_warehouse_uuid,
                created_at,
                ROW_NUMBER() OVER (PARTITION BY purchase_entry_uuid ORDER BY created_at DESC) as rn
              FROM inventory.internal_transfer
            )
            SELECT 
              lt.purchase_entry_uuid,
              w.uuid,
              w.name
            FROM latest_transfers lt
            LEFT JOIN inventory.warehouse w ON w.uuid = lt.to_warehouse_uuid
            WHERE rn = 1
          ) transfer_warehouse`,
          sql`transfer_warehouse.purchase_entry_uuid = ${purchase_entry.uuid}`,
        ) as any;
      // Include entries from internal transfers OR entries from purchase_entry table not in internal_transfer
      filters.push(
        sql`(${purchase_entry.uuid} IN ${transferredPurchaseEntryUuids} OR
            ${purchase_entry.uuid} NOT IN (SELECT DISTINCT purchase_entry_uuid FROM inventory.internal_transfer WHERE purchase_entry_uuid IS NOT NULL))`,
      );
    }
    else {
    // No internal transfers found, just filter by warehouse_uuid from purchase_entry
      filters.push(
        sql`${purchase_entry.uuid} NOT IN (SELECT DISTINCT purchase_entry_uuid FROM inventory.internal_transfer WHERE purchase_entry_uuid IS NOT NULL)`,
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
