import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { brand, model } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { is_brand, brand_uuid } = c.req.query();
  const modelPromise = db
    .select({
      value: model.uuid,
      label: is_brand === 'false' ? model.name : sql`CONCAT(${model.name}, '(', ${brand.name}, ')')`,
      brand_uuid: model.brand_uuid,
    })
    .from(model)
    .leftJoin(
      brand,
      eq(model.brand_uuid, brand.uuid),
    );

  if (brand_uuid) {
    modelPromise.where(eq(model.brand_uuid, brand_uuid));
  }

  const data = await modelPromise;

  return c.json(data, HSCode.OK);
};
