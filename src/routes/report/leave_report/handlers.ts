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
                    (
                           SELECT JSON_AGG(
                                    JSON_BUILD_OBJECT(
                                        'leave_policy_uuid', el_distinct.type_uuid,
                                        'leave_policy_name', lp.name,
                                        'effective_date', (
                                            SELECT
                                                employee_log.effective_date
                                            FROM hr.employee_log
                                            WHERE
                                                employee_log.employee_uuid = employee.uuid
                                                AND employee_log.type = 'leave_policy'
                                                AND employee_log.type_uuid = el_distinct.type_uuid
                                            ORDER BY employee_log.effective_date DESC
                                            LIMIT 1
                                            )
                                        
                                    )
                                )
                                FROM (
                                    SELECT DISTINCT
                                        el.type_uuid
                                    FROM
                                        GENERATE_SERIES(${from_date}::date, ${to_date}::date, INTERVAL '1 day') AS d
                                    LEFT JOIN LATERAL (
                                        SELECT
                                            employee_log.type_uuid,
                                            employee_log.effective_date
                                        FROM hr.employee_log
                                        WHERE
                                            employee_log.employee_uuid = employee.uuid
                                            AND employee_log.type = 'leave_policy'
                                            AND employee_log.effective_date ::date <= d
                                        ORDER BY employee_log.effective_date DESC
                                        LIMIT 1
                                    ) el ON TRUE
                                    WHERE el.type_uuid IS NOT NULL
                                ) AS el_distinct
                                LEFT JOIN hr.leave_policy lp ON el_distinct.type_uuid = lp.uuid
                        ) AS leave_policies,
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
                    `} as days
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
                    hr.employment_type ON employee.employment_type_uuid = employment_type.uuid
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
                    WITH leave_dates AS (
                        SELECT
                        al.employee_uuid,
                        al.leave_category_uuid,
                        d::date AS leave_date,
                        al.type,
                        CASE WHEN al.type = 'half' THEN 0.5 ELSE 1 END AS day_value
                        FROM hr.apply_leave al
                        JOIN GENERATE_SERIES(al.from_date::date, al.to_date::date, INTERVAL '1 day') AS d ON TRUE
                        WHERE al.approval = 'approved'
                        ${from_date && to_date ? sql`AND d::date >= ${from_date}::date AND d::date <= ${to_date}::date` : sql``}
                    ),
                    leave_policy_per_date AS (
                        SELECT
                            ld.employee_uuid,
                            ld.leave_category_uuid,
                            ld.leave_date,
                            ld.day_value,
                            el.type_uuid AS leave_policy_uuid
                        FROM leave_dates ld
                        LEFT JOIN LATERAL (
                                        SELECT employee_log.type_uuid
                                                FROM hr.employee_log
                                                WHERE employee_log.employee_uuid = ld.employee_uuid
                                                    AND employee_log.type = 'leave_policy'
                                                    AND employee_log.effective_date <= ld.leave_date
                                                ORDER BY employee_log.effective_date DESC
                                                LIMIT 1
                                        ) el ON TRUE
                    ),
                    used_days_agg AS (
                        SELECT
                        employee_uuid,
                        leave_policy_uuid,
                        leave_category_uuid,
                        SUM(day_value) AS used_days
                        FROM leave_policy_per_date
                        GROUP BY employee_uuid, leave_policy_uuid, leave_category_uuid
                    )
                    SELECT
                        e.uuid AS employee_uuid,
                        e.employee_id,
                        u.name AS employee_name,
                        d.department AS employee_department,
                        des.designation AS employee_designation,
                        et.name AS employment_type_name,
                        JSON_AGG(
                        JSON_BUILD_OBJECT(
                            'leave_policy_uuid', lp.uuid,
                            'leave_policy_name', lp.name,
                            'leave_categories', (
                            SELECT JSON_AGG(
                                JSON_BUILD_OBJECT(
                                'leave_category_uuid', lc.uuid,
                                'leave_category_name', lc.name,
                                'allowed_leaves', ce.maximum_number_of_allowed_leaves::float8,
                                'used_days', COALESCE(uda.used_days, 0)::float8,
                                'remaining_days', (ce.maximum_number_of_allowed_leaves - COALESCE(uda.used_days, 0))::float8
                                ) ORDER BY lc.name
                            )
                            FROM hr.configuration_entry ce
                            JOIN hr.leave_category lc ON ce.leave_category_uuid = lc.uuid
                            WHERE ce.configuration_uuid = c.uuid
                            )
                        ) ORDER BY lp.name
                        ) AS leave_policies
                    FROM hr.employee e
                    LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                    LEFT JOIN hr.department d ON u.department_uuid = d.uuid
                    LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                    LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                    LEFT JOIN used_days_agg uda ON e.uuid = uda.employee_uuid
                    LEFT JOIN hr.leave_policy lp ON uda.leave_policy_uuid = lp.uuid
                    LEFT JOIN hr.configuration c ON c.leave_policy_uuid = lp.uuid
                    WHERE ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                    GROUP BY e.uuid, e.employee_id, u.name, d.department, des.designation, et.name
                    ORDER BY u.name;
`;
  // ...existing code...

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};

export const leaveBalanceReport2: AppRouteHandler<LeaveBalanceReportRoute> = async (c: any) => {
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
