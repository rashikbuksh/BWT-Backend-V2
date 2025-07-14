import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { accessory } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const accessoryPromise = db.select({
    value: accessory.uuid,
    label: accessory.name,
  })
    .from(accessory);

  const data = await accessoryPromise;

  return c.json(data, HSCode.OK);
};
