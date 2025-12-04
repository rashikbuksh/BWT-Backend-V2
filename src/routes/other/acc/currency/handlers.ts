import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { currency } from '@/routes/acc/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const currencyPromise = db.select({
    value: currency.uuid,
    label: sql`${currency.currency} || ' (' || ${currency.symbol} || ')'`,
    conversion_rate: PG_DECIMAL_TO_FLOAT(
      currency.conversion_rate,
    ),
    default: currency.default,
    symbol: currency.symbol,
  })
    .from(currency);

  const data = await currencyPromise;

  return c.json(data || [], HSCode.OK);
};
