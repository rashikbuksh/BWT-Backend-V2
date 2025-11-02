import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { fiscal_year } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const fiscalYearPromise = db.select({
    value: fiscal_year.uuid,
    label: fiscal_year.year,
  })
    .from(fiscal_year);

  const data = await fiscalYearPromise;

  return c.json(data || [], HSCode.OK);
};
