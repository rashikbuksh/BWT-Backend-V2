import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { rack } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const rackPromise = db.select({
    value: rack.uuid,
    label: rack.name,
  })
    .from(rack);

  const data = await rackPromise;

  return c.json(data, HSCode.OK);
};
