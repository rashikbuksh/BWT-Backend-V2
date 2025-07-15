import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { designation } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const designationPromise = db
    .select({
      value: designation.uuid,
      label: designation.designation,
    })
    .from(designation);

  const data = await designationPromise;

  return c.json(data || [], HSCode.OK);
};
