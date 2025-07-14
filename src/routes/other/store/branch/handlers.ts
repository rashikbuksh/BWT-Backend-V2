import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { branch } from '@/routes/store/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const branchPromise = db.select({
    value: branch.uuid,
    label: branch.name,
  })
    .from(branch);

  const data = await branchPromise;

  return c.json(data, HSCode.OK);
};
