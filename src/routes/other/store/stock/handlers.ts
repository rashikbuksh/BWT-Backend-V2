import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { stock } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const stockPromise = db.select({
    value: stock.uuid,
    label: sql`CONCAT('SS',TO_CHAR(${stock.created_at}, 'YY'),' - ', ${stock.id})`,
  })
    .from(stock);

  const data = await stockPromise;

  return c.json(data, HSCode.OK);
};
