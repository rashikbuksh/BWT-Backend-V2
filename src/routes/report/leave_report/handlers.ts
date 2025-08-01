import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { LeaveBalanceReportRoute, LeaveHistoryReportRoute } from './routes';

export const leaveHistoryReport: AppRouteHandler<LeaveHistoryReportRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('query');

  const query = sql`
    SELECT
        employee.uuid as employee_uuid,
        users.name as employee_name,
        leave_category.uuid as leave_category_uuid,
        leave_category.name as leave_category_name,
        apply_leave.year as year,
        apply_leave.type as type,
        apply_leave.from_date as from_date,
        apply_leave.to_date as to_date,
        apply_leave.reason,
        (apply_leave.to_date::date - apply_leave.from_date::date + 1) as days,
        employment_type.name as employment_type_name
    FROM
        hr.apply_leave
    LEFT JOIN
        hr.employee ON employee.uuid = apply_leave.employee_uuid
    LEFT JOIN
        hr.users ON employee.user_uuid = users.uuid
    LEFT JOIN
        hr.leave_category ON apply_leave.leave_category_uuid = leave_category.uuid
    LEFT JOIN 
        hr.employment_type ON employee.employment_type_uuid = employment_type.uuid
    WHERE 
        ${employee_uuid ? sql`employee.uuid = ${employee_uuid}` : sql`TRUE`}
  `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};

export const leaveBalanceReport: AppRouteHandler<LeaveBalanceReportRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('query');

  const query = sql`
    SELECT
        employee.uuid as employee_uuid,
        users.name as employee_name,
        leave_policy.uuid as leave_policy_uuid,
        leave_policy.name as leave_policy_name,
        leave_category.uuid as leave_category_uuid,
        leave_category.name as leave_category_name,
        configuration_entry.maximum_number_of_allowed_leaves as allowed_leaves,
        COALESCE(apply_leave_sum.total_days, 0) as used_days,
        (configuration_entry.maximum_number_of_allowed_leaves - COALESCE(apply_leave_sum.total_days, 0)) as remaining_days,
        employment_type.name as employment_type_name
    FROM
        hr.employee
    LEFT JOIN
        hr.users ON employee.user_uuid = users.uuid
    LEFT JOIN
        hr.employment_type ON employee.employment_type_uuid = employment_type.uuid
    LEFT JOIN
        hr.leave_policy ON employee.leave_policy_uuid = leave_policy.uuid
    LEFT JOIN 
        hr.configuration ON configuration.leave_policy_uuid = leave_policy.uuid
    LEFT JOIN 
        hr.configuration_entry ON configuration.uuid = configuration_entry.configuration_uuid
    LEFT JOIN 
        hr.leave_category ON configuration_entry.leave_category_uuid = leave_category.uuid
    LEFT JOIN
        (
            SELECT
                employee_uuid,
                leave_category_uuid,
                SUM(
                    CASE 
                        WHEN type = 'full' THEN (to_date::date - from_date::date + 1)
                        WHEN type = 'half' THEN (to_date::date - from_date::date + 1) * 0.5
                        ELSE (to_date::date - from_date::date + 1)
                    END
                ) as total_days
            FROM
                hr.apply_leave
            GROUP BY
                employee_uuid, leave_category_uuid
        ) as apply_leave_sum ON employee.uuid = apply_leave_sum.employee_uuid AND leave_category.uuid = apply_leave_sum.leave_category_uuid
    WHERE 
        ${employee_uuid ? sql`employee.uuid = ${employee_uuid}` : sql`TRUE`}
    ORDER BY
        users.name
  `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
