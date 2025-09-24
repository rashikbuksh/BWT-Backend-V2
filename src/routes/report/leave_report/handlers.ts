import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { LeaveBalanceReportRoute, LeaveHistoryReportRoute } from './routes';

export const leaveHistoryReport: AppRouteHandler<LeaveHistoryReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date, category_uuid, approval } = c.req.valid('query');

  const query = sql`
    SELECT
        employee.uuid as employee_uuid,
        employee.employee_id as employee_id,
        users.name as employee_name,
        designation.designation as employee_designation,
        department.department as employee_department,
        leave_category.uuid as leave_category_uuid,
        leave_category.name as leave_category_name,
        apply_leave.year as year,
        apply_leave.type as type,
        apply_leave.from_date as from_date,
        apply_leave.to_date as to_date,
        apply_leave.reason,
        (apply_leave.to_date::date - apply_leave.from_date::date + 1) as total_days,
        employment_type.name as employment_type_name,
        leave_policy.uuid as leave_policy_uuid,
        leave_policy.name as leave_policy_name,
        apply_leave.approval as approval,
        ${from_date && to_date
          ? sql`
            CASE 
                WHEN apply_leave.type = 'half' THEN
                    (GREATEST(0, (LEAST(apply_leave.to_date::date, ${to_date}::date) 
                    - GREATEST(apply_leave.from_date::date, ${from_date}::date) + 1)) * 0.5)::FLOAT
                ELSE
                    GREATEST(0, (LEAST(apply_leave.to_date::date, ${to_date}::date) 
                    - GREATEST(apply_leave.from_date::date, ${from_date}::date) + 1))::FLOAT
            END
        `
          : sql`
            CASE 
                WHEN apply_leave.type = 'half' THEN
                    ((apply_leave.to_date::date - apply_leave.from_date::date + 1) * 0.5)::FLOAT
                ELSE
                    (apply_leave.to_date::date - apply_leave.from_date::date + 1)::FLOAT
            END
        `} as days,
        shifts.end_time::time - shifts.start_time::time as expected_hours
    FROM
        hr.apply_leave
    LEFT JOIN
        hr.employee ON employee.uuid = apply_leave.employee_uuid
    LEFT JOIN
        hr.users ON employee.user_uuid = users.uuid
    LEFT JOIN
        hr.department ON users.department_uuid = department.uuid
    LEFT JOIN
        hr.designation ON users.designation_uuid = designation.uuid
    LEFT JOIN
        hr.leave_category ON apply_leave.leave_category_uuid = leave_category.uuid
    LEFT JOIN
        hr.leave_policy ON employee.leave_policy_uuid = leave_policy.uuid
    LEFT JOIN 
        hr.employment_type ON employee.employment_type_uuid = employment_type.uuid
    LEFT JOIN
        hr.shift_group ON employee.shift_group_uuid = shift_group.uuid
    LEFT JOIN
        hr.shifts ON shift_group.uuid = shifts.shift_group_uuid
    WHERE 
        ${employee_uuid ? sql`employee.uuid = ${employee_uuid}` : sql`TRUE`}
        ${from_date && to_date
          ? sql`AND (
            apply_leave.from_date::date <= ${to_date}::date
            AND apply_leave.to_date::date >= ${from_date}::date
        )`
          : sql``}
        ${category_uuid ? sql`AND leave_category.uuid = ${category_uuid}` : sql``}
        ${approval ? sql`AND apply_leave.approval = ${approval}` : sql``}
  `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};

export const leaveBalanceReport: AppRouteHandler<LeaveBalanceReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date } = c.req.valid('query');

  const query = sql`
    WITH leave_balance_data AS (
      SELECT
          employee.uuid as employee_uuid,
          employee.employee_id as employee_id,
          users.name as employee_name,
          department.department as employee_department,
          designation.designation as employee_designation,
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
          hr.department ON users.department_uuid = department.uuid
      LEFT JOIN
          hr.designation ON users.designation_uuid = designation.uuid
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
              WHERE
                  approval = 'approved'
               ${from_date && to_date ? sql`AND from_date >= ${from_date}::date AND to_date <= ${to_date}::date` : sql``}
              GROUP BY
                  employee_uuid, leave_category_uuid
          ) as apply_leave_sum ON employee.uuid = apply_leave_sum.employee_uuid AND leave_category.uuid = apply_leave_sum.leave_category_uuid
      WHERE 
          ${employee_uuid ? sql`employee.uuid = ${employee_uuid}` : sql`TRUE`}
          AND leave_category.uuid IS NOT NULL
    )
    SELECT
        employee_uuid,
        employee_id,
        employee_name,
        employee_designation,
        employee_department,
        leave_policy_uuid,
        leave_policy_name,
        employment_type_name,
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'leave_category_uuid', leave_category_uuid,
                'leave_category_name', leave_category_name,
                'allowed_leaves', allowed_leaves::float8,
                'used_days', used_days::float8,
                'remaining_days', remaining_days::float8
            ) ORDER BY leave_category_name
        ) AS leave_categories
    FROM leave_balance_data
    GROUP BY employee_uuid, employee_name, leave_policy_uuid, leave_policy_name, employment_type_name,
        employee_id, employee_designation, employee_department
    ORDER BY employee_name;
  `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
