import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { brand } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const brandPromise = db.select({
    value: brand.uuid,
    label: brand.name,
  })
    .from(brand);

  const data = await brandPromise;

  return c.json(data, HSCode.OK);
};
