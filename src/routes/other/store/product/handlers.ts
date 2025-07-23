import type { AppRouteHandler } from '@/lib/types';

import { gt, or } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { product } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { is_quantity } = c.req.valid('query');
  const productPromise = db.select({
    value: product.uuid,
    label: product.name,
    warehouse_1: PG_DECIMAL_TO_FLOAT(product.warehouse_1),
    warehouse_2: PG_DECIMAL_TO_FLOAT(product.warehouse_2),
    warehouse_3: PG_DECIMAL_TO_FLOAT(product.warehouse_3),
    warehouse_4: PG_DECIMAL_TO_FLOAT(product.warehouse_4),
    warehouse_5: PG_DECIMAL_TO_FLOAT(product.warehouse_5),
    warehouse_6: PG_DECIMAL_TO_FLOAT(product.warehouse_6),
    warehouse_7: PG_DECIMAL_TO_FLOAT(product.warehouse_7),
    warehouse_8: PG_DECIMAL_TO_FLOAT(product.warehouse_8),
    warehouse_9: PG_DECIMAL_TO_FLOAT(product.warehouse_9),
    warehouse_10: PG_DECIMAL_TO_FLOAT(product.warehouse_10),
    warehouse_11: PG_DECIMAL_TO_FLOAT(product.warehouse_11),
    warehouse_12: PG_DECIMAL_TO_FLOAT(product.warehouse_12),
  })
    .from(product);

  if (is_quantity) {
    productPromise.where(
      or(
        gt(product.warehouse_1, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_2, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_3, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_4, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_5, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_6, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_7, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_8, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_9, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_10, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_11, PG_DECIMAL_TO_FLOAT(0, false)),
        gt(product.warehouse_12, PG_DECIMAL_TO_FLOAT(0, false)),
      ),
    );
  }

  const data = await productPromise;

  return c.json(data, HSCode.OK);
};
