import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { festival } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const festivalPromise = db.select({
    value: festival.uuid,
    label: festival.name,
  })
    .from(festival);

  const data = await festivalPromise;

  return c.json(data || [], HSCode.OK);
};
