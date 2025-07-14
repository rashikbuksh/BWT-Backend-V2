import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { courier } from '@/routes/delivery/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const courierPromise = db
    .select({
      value: courier.uuid,
      label: sql`CONCAT(${courier.name}, '-', ${courier.branch})`,
    })
    .from(courier);

  const data = await courierPromise;

  return c.json(data, HSCode.OK);
};
