import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { employment_type } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const employmentTypePromise = db
    .select({
      value: employment_type.uuid,
      label: employment_type.name,
    })
    .from(employment_type);

  const data = await employmentTypePromise;

  return c.json(data || [], HSCode.OK);
};
