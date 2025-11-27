import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { category, product } from '@/routes/inventory/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const categoryPromise = db.select({
    value: category.uuid,
    label: category.name,
    total_products: sql`COUNT(${product.uuid})::float8`.as('total_products'),
    image: category.image,
  })
    .from(category)
    .leftJoin(product, sql`${product.category_uuid} = ${category.uuid}`)
    .groupBy(category.uuid, category.name);

  const data = await categoryPromise;

  return c.json(data, HSCode.OK);
};
