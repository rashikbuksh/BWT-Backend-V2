import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { department } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const departmentPromise = db.select({
    value: department.uuid,
    label: department.department,
  })
    .from(department);

  const data = await departmentPromise;

  return c.json(data, HSCode.OK);
};
