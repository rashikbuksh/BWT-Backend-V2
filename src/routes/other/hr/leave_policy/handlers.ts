import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { configuration, leave_policy } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { filteredConf } = c.req.valid('query');

  const leavePolicyPromise = db
    .select({
      value: leave_policy.uuid,
      label: leave_policy.name,
      is_default: leave_policy.is_default,
    })
    .from(leave_policy)
    .leftJoin(configuration, eq(leave_policy.uuid, configuration.leave_policy_uuid))
    .where(
      filteredConf === 'true'
        ? sql`${configuration.uuid} IS NULL`
        : sql`true`,
    );

  const data = await leavePolicyPromise;

  return c.json(data || [], HSCode.OK);
};
