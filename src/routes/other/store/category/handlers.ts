import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { category } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const categoryPromise = db.select({
    value: category.uuid,
    label: category.name,
  })
    .from(category);

  const data = await categoryPromise;

  return c.json(data, HSCode.OK);
};
