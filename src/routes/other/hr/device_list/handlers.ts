import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { device_list, device_permission } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('query');

  const deviceListPromise = db
    .select({
      value: sql`DISTINCT ${device_list.uuid}`,
      label: device_list.name,
    })
    .from(device_list)
    .leftJoin(
      device_permission,
      eq(
        device_list.uuid,
        device_permission.device_list_uuid,
      ),
    )
    .where(
      employee_uuid !== undefined && employee_uuid !== '' && employee_uuid !== null
        ? sql`${device_permission.employee_uuid} IS NULL`
        : sql`true`,
    );

  const data = await deviceListPromise;

  return c.json(data || [], HSCode.OK);
};
