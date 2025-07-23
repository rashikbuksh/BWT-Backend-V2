import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { purchase } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const purchasePromise = db
    .select({
      value: purchase.uuid,
      label: sql`CONCAT('SP',TO_CHAR(${purchase.created_at}, 'YY'),' - ',TO_CHAR(${purchase.id}, 'FM0000'))`,
    })
    .from(purchase);

  const data = await purchasePromise;

  return c.json(data, HSCode.OK);
};
