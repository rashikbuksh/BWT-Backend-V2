import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { purchase_return } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const purchaseReturnPromise = db
    .select({
      value: purchase_return.uuid,
      label: sql`CONCAT('SPR',TO_CHAR(${purchase_return.created_at}, 'YY'),' - ',TO_CHAR(${purchase_return.id}, 'FM0000'))`,
    })
    .from(purchase_return);

  const data = await purchaseReturnPromise;

  return c.json(data, HSCode.OK);
};
