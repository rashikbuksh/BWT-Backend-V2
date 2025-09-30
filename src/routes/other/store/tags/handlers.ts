import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { tags } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const tagsPromise = db.select({
    value: tags.uuid,
    label: tags.name,
  })
    .from(tags);

  const data = await tagsPromise;

  return c.json(data, HSCode.OK);
};
