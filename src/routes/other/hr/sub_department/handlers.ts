import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { sub_department } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const subDepartmentPromise = db
    .select({
      value: sub_department.uuid,
      label: sub_department.name,
    })
    .from(sub_department);

  const data = await subDepartmentPromise;

  return c.json(data || [], HSCode.OK);
};
