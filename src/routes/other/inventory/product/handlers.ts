import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { product } from '@/routes/inventory/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { uuid } = c.req.valid('query');

  const productPromise = db.select({
    value: product.uuid,
    label: product.name,
  })
    .from(product);

  if (uuid)
    productPromise.where(eq(product.uuid, uuid));

  const data = await productPromise;

  return c.json(data, HSCode.OK);
};
