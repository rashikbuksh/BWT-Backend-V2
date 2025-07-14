import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { section } from '@/routes/work/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const sectionPromise = db.select({
    value: section.uuid,
    label: section.name,
  })
    .from(section);

  const data = await sectionPromise;

  return c.json(data, HSCode.OK);
};
