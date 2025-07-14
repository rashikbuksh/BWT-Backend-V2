import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { process } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const processPromise = db
    .select({
      value: process.uuid,
      label: sql`CONCAT('WP',TO_CHAR(${process.created_at}, 'YY'),' - ',TO_CHAR(${process.id}, 'FM0000'))`,
    })
    .from(process);

  const data = await processPromise;

  return c.json(data, HSCode.OK);
};
