import type { AppRouteHandler } from '@/lib/types';

import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { vehicle } from '@/routes/delivery/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const vehiclePromise = db
    .select({
      value: vehicle.uuid,
      label: vehicle.name,
    })
    .from(vehicle);

  const data = await vehiclePromise;

  return c.json(data, HSCode.OK);
};
