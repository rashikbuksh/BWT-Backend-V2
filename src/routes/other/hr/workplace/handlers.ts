import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { workplace } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const workplacePromise = db
    .select({
      value: workplace.uuid,
      label: workplace.name,
    })
    .from(workplace);

  const data = await workplacePromise;

  return c.json(data || [], HSCode.OK);
};
