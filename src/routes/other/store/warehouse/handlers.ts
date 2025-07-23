import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { branch, product, purchase_entry, warehouse } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { branch_uuid, purchase_uuid, product_uuid } = c.req.valid('query');
  let warehousePromise = db.selectDistinct({
    value: warehouse.uuid,
    label: sql`CONCAT( ${warehouse.name}, '(', ${branch.name}, ')' )`,
    assigned: warehouse.assigned,
    warehouse_name: warehouse.name,
    branch_name: branch.name,
  })
    .from(warehouse)
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid));

  const filters = [];

  if (branch_uuid) {
    filters.push(eq(warehouse.branch_uuid, branch_uuid));
  }

  if (purchase_uuid) {
    warehousePromise = warehousePromise
      .leftJoin(
        purchase_entry,
        eq(warehouse.uuid, purchase_entry.warehouse_uuid),
      );
    filters.push(eq(purchase_entry.purchase_uuid, purchase_uuid));
  }

  if (product_uuid) {
    warehousePromise = warehousePromise
      .leftJoin(
        purchase_entry,
        eq(warehouse.uuid, purchase_entry.warehouse_uuid),
      )
      .leftJoin(product, eq(purchase_entry.product_uuid, product.uuid));

    filters.push(eq(purchase_entry.product_uuid, product_uuid));

    // Filter based on assigned warehouse and product stock for warehouse_1 to warehouse_12
    filters.push(
      sql`CASE 
        WHEN ${warehouse.assigned} = 'warehouse_1' THEN ${product.warehouse_1} > 0
        WHEN ${warehouse.assigned} = 'warehouse_2' THEN ${product.warehouse_2} > 0
        WHEN ${warehouse.assigned} = 'warehouse_3' THEN ${product.warehouse_3} > 0
        WHEN ${warehouse.assigned} = 'warehouse_4' THEN ${product.warehouse_4} > 0
        WHEN ${warehouse.assigned} = 'warehouse_5' THEN ${product.warehouse_5} > 0
        WHEN ${warehouse.assigned} = 'warehouse_6' THEN ${product.warehouse_6} > 0
        WHEN ${warehouse.assigned} = 'warehouse_7' THEN ${product.warehouse_7} > 0
        WHEN ${warehouse.assigned} = 'warehouse_8' THEN ${product.warehouse_8} > 0
        WHEN ${warehouse.assigned} = 'warehouse_9' THEN ${product.warehouse_9} > 0
        WHEN ${warehouse.assigned} = 'warehouse_10' THEN ${product.warehouse_10} > 0
        WHEN ${warehouse.assigned} = 'warehouse_11' THEN ${product.warehouse_11} > 0
        WHEN ${warehouse.assigned} = 'warehouse_12' THEN ${product.warehouse_12} > 0
        ELSE TRUE
      END`,
    );
  }
  if (filters.length > 0) {
    warehousePromise = (warehousePromise as any).where(and(...filters));
  }
  const data = await warehousePromise;

  return c.json(data, HSCode.OK);
};
