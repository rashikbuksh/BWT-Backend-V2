import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { zone } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const zonePromise = db.select({
    value: zone.uuid,
    label: zone.name,
  })
    .from(zone);

  const data = await zonePromise;

  return c.json(data, HSCode.OK);
};
