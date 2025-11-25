import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { configuration, configuration_entry, leave_category, leave_policy, leave_policy_log } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('query');

  const leaveCategoryPromise = db
    .select({
      value: sql`DISTINCT leave_category.uuid`,
      label: leave_category.name,
    })
    .from(leave_category)
    .leftJoin(
      configuration_entry,
      eq(
        leave_category.uuid,
        configuration_entry.leave_category_uuid,
      ),
    )
    .leftJoin(
      configuration,
      eq(
        configuration_entry.configuration_uuid,
        configuration.uuid,
      ),
    )
    .leftJoin(
      leave_policy,
      eq(
        configuration.leave_policy_uuid,
        leave_policy.uuid,
      ),
    )
    .leftJoin(
      leave_policy_log,
      eq(leave_policy.uuid, leave_policy_log.leave_policy_uuid),
    )
    .where(
      employee_uuid
        ? eq(leave_policy_log.employee_uuid, employee_uuid)
        : sql`true`,
    );

  const data = await leaveCategoryPromise;

  return c.json(data || [], HSCode.OK);
};
