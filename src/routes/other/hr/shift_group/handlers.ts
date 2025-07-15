import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { shift_group } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const shiftGroupPromise = db
    .select({
      value: shift_group.uuid,
      label: shift_group.name,
    })
    .from(shift_group);

  const data = await shiftGroupPromise;

  return c.json(data || [], HSCode.OK);
};
