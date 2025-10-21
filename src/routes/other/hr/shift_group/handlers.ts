import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { shift_group, shifts } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const shiftGroupPromise = db
    .select({
      value: shift_group.uuid,
      label: sql<string>`concat(${shift_group.name}, ' (', ${shifts.name}, ')')`.as('label'),
      effective_date: shift_group.effective_date,
      start_time: shifts.start_time,
      end_time: shifts.end_time,
      is_default: shift_group.default_shift,
    })
    .from(shift_group)
    .leftJoin(shifts, eq(shift_group.shifts_uuid, shifts.uuid));

  const data = await shiftGroupPromise;

  return c.json(data || [], HSCode.OK);
};
