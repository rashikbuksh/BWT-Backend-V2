import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { size } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const sizePromise = db.select({
    value: size.uuid,
    label: size.name,
  })
    .from(size);

  const data = await sizePromise;

  return c.json(data, HSCode.OK);
};
