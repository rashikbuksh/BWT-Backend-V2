import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { shifts } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const shiftsPromise = db
    .select({
      value: shifts.uuid,
      label: shifts.name,
    })
    .from(shifts);

  const data = await shiftsPromise;

  return c.json(data || [], HSCode.OK);
};
