import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { diagnosis } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const diagnosisPromise = db
    .select({
      value: diagnosis.uuid,
      label: sql`CONCAT('WD',TO_CHAR(${diagnosis.created_at}, 'YY'),' - ',TO_CHAR(${diagnosis.id}, 'FM0000'))`,
    })
    .from(diagnosis);

  const data = await diagnosisPromise;

  return c.json(data, HSCode.OK);
};
