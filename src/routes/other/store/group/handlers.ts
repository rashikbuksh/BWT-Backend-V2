import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { group } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const groupPromise = db.select({
    value: group.uuid,
    label: group.name,
  })
    .from(group);

  const data = await groupPromise;

  return c.json(data, HSCode.OK);
};
