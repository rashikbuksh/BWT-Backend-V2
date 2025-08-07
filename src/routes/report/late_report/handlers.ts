import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { DailyLateReportRoute, LateReportRoute } from './routes';

export const lateReport: AppRouteHandler<LateReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date } = c.req.valid('query');

  const query = sql`
                WITH date_series AS (
                  SELECT generate_series(${from_date}::date, ${to_date}::date, INTERVAL '1 day')::date AS punch_date
                ),
                user_dates AS (
                  SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
                  FROM hr.users u
                  CROSS JOIN date_series d
                ),
                attendance_data AS (
                  SELECT
                    ud.user_uuid,
                    e.employee_id AS employee_id,
                    ud.employee_name,
                    d.department AS employee_department,
                    des.designation AS employee_designation,
                    s.name AS shift_name,
                    s.start_time,
                    s.end_time,
                    s.late_time,
                    s.early_exit_before,
                    DATE(ud.punch_date) AS punch_date,
                    MIN(pl.punch_time) AS entry_time,
                    MAX(pl.punch_time) AS exit_time,
                    CASE WHEN MIN(pl.punch_time)::time - s.late_time::time > INTERVAL '0 seconds' THEN
                        MIN(pl.punch_time)::time - s.late_time::time
                    END AS late_start_time,
                    CASE 
                        WHEN MIN(pl.punch_time) IS NOT NULL 
                        AND MIN(pl.punch_time)::time > s.late_time::time 
                        THEN CONCAT(
                            FLOOR(EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::int, 
                            'h ', 
                            FLOOR((EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) % 3600) / 60)::int, 
                            'm'
                        )
                        ELSE '0h 0m'
                    END AS late_hours,
                    CASE WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN
                                s.early_exit_before::time - MAX(pl.punch_time)::time
                    END AS early_exit_time,
                    CASE 
                        WHEN MAX(pl.punch_time) IS NOT NULL 
                            AND MAX(pl.punch_time)::time < s.early_exit_before::time 
                                THEN CONCAT(
                                    FLOOR(EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::int, 
                                    'h ', 
                                    FLOOR((EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) % 3600) / 60)::int, 
                                    'm'
                                )
                        ELSE '0h 0m'
                    END AS early_exit_hours,
                    CASE 
                        WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
                            CONCAT(
                                FLOOR(EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::int, 
                                'h ', 
                                FLOOR((EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) % 3600) / 60)::int, 
                                'm'
                            )
                        ELSE NULL
                    END AS hours_worked,
                    CONCAT(
                        FLOOR(EXTRACT(EPOCH FROM s.end_time - s.start_time) / 3600)::int, 
                        'h ', 
                        FLOOR((EXTRACT(EPOCH FROM s.end_time - s.start_time) % 3600) / 60)::int, 
                        'm'
                    ) AS expected_hours,
                    CASE
                      WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                      WHEN MIN(pl.punch_time)::time > s.late_time::time THEN 'Late'
                      WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                      ELSE 'Present'
                    END as status
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                  LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                  LEFT JOIN hr.department d ON u.department_uuid = d.uuid
                  LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                  LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                  LEFT JOIN hr.shift_group sg ON e.shift_group_uuid = sg.uuid
                  LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
                  WHERE 
                    ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before,e.employee_id,d.department, des.designation
                )
               SELECT
                    ad.punch_date AS date,
                    COUNT(*)  AS late_count,
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                        'employee_id',ad.employee_id,
                        'employee_name', ad.employee_name,
                        'employee_department', ad.employee_department,
                        'employee_designation', ad.employee_designation,
                        'shift',         ad.shift_name,
                        'entry_time',    ad.entry_time,
                        'late_hours',    ad.late_hours
                        ) ORDER BY ad.employee_name
                    ) AS late_records
                    FROM attendance_data ad
                    WHERE ad.status = 'Late'
                    GROUP BY ad.punch_date
                    ORDER BY ad.punch_date;
              `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};

export const dailyLateReport: AppRouteHandler<DailyLateReportRoute> = async (c: any) => {
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
