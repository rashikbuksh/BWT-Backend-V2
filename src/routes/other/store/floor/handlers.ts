import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { floor } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const floorPromise = db.select({
    value: floor.uuid,
    label: floor.name,
  })
    .from(floor);

  const data = await floorPromise;

  return c.json(data, HSCode.OK);
};
