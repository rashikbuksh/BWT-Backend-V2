import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { product_attributes } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const productAttributesPromise = db.select({
    value: product_attributes.uuid,
    label: product_attributes.name,
  })
    .from(product_attributes);

  const data = await productAttributesPromise;

  return c.json(data, HSCode.OK);
};
