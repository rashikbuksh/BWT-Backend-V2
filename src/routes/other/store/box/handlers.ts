import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { box } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const boxPromise = db.select({
    value: box.uuid,
    label: box.name,
  })
    .from(box);

  const data = await boxPromise;

  return c.json(data, HSCode.OK);
};
