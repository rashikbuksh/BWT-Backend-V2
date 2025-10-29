import type { AppRouteHandler } from '@/lib/types';

import { and, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { configuration, configuration_entry, employee, leave_category, leave_policy, users } from '@/routes/hr/schema';

import type { ValueLabelRoute } from './routes';

export const valueLabel: AppRouteHandler<ValueLabelRoute> = async (c: any) => {
  const { is_hr, is_line_manager, leave_policy_required } = c.req.valid('query');

  const employeePromise = db
    .select({
      value: (is_hr === 'true' || is_line_manager === 'true')
        ? employee.user_uuid
        : employee.uuid,
      label: users.name,
      user_uuid: employee.user_uuid,
      policy: sql`
        jsonb_agg(
          jsonb_build_object(
            'name', ${leave_category.name},
            'balance', (${configuration_entry.maximum_number_of_allowed_leaves} - COALESCE(leave_applied.total_leaves, 0)::numeric)
          )
        )
      `,
      email: (is_hr === 'true' || is_line_manager === 'true')
        ? users.email
        : sql`NULL`,

    })
    .from(employee)
    .leftJoin(
      users,
      eq(employee.user_uuid, users.uuid),
    )
    .leftJoin(
      leave_policy,
      eq(sql`(SELECT el.type_uuid
            FROM hr.employee_log el
            WHERE el.employee_uuid = ${employee.uuid}
            AND el.type = 'leave_policy' AND el.effective_date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1)`, leave_policy.uuid),
    )
    .leftJoin(
      configuration,
      eq(
        leave_policy.uuid,
        configuration.leave_policy_uuid,
      ),
    )
    .leftJoin(
      configuration_entry,
      eq(
        configuration.uuid,
        configuration_entry.configuration_uuid,
      ),
    )
    .leftJoin(
      leave_category,
      eq(
        configuration_entry.leave_category_uuid,
        leave_category.uuid,
      ),
    )
    .leftJoin(
      sql`(
        SELECT 
          leave_category_uuid,
          employee_uuid,
          year,
          SUM(date_part('day', to_date - from_date)) AS total_leaves
        FROM
          hr.apply_leave
        WHERE 
          approval != 'rejected'
        GROUP BY
          leave_category_uuid, employee_uuid, year
      ) as leave_applied`,
      and(
        eq(
          leave_category.uuid,
          sql`leave_applied.leave_category_uuid`,
        ),
        eq(employee.uuid, sql`leave_applied.employee_uuid`),
      ),
    )
    .where(
      and(
        leave_policy_required
          ? sql`(SELECT el.type_uuid
            FROM hr.employee_log el
            WHERE el.employee_uuid = ${employee.uuid}
            AND el.type = 'leave_policy' AND el.effective_date <= CURRENT_DATE
            ORDER BY el.effective_date DESC
            LIMIT 1) IS NOT NULL`
          : sql`true`,
        is_hr === 'true'
          ? eq(employee.is_hr, true)
          : sql`true`,
        is_line_manager === 'true'
          ? eq(employee.is_line_manager, true)
          : sql`true`,
      ),
    )
    .groupBy(employee.uuid, users.name, users.email, employee.user_uuid);

  const data = await employeePromise;

  return c.json(data || [], HSCode.OK);
};
