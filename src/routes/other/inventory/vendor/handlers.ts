import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { vendor } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const vendorPromise = db.select({
    value: vendor.uuid,
    label: vendor.name,
  })
    .from(vendor);

  const data = await vendorPromise;

  return c.json(data, HSCode.OK);
};
