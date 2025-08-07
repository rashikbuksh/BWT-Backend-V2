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
                    e.uuid AS employee_uuid,
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
                        'employee_user_uuid', ad.user_uuid,
                        'employee_uuid', ad.employee_uuid,
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
                    ud.employee_name,
                    e.employee_id AS employee_id,
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
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before
                )
                SELECT
                    user_uuid,
                    employee_name,
                    shift_name,
                    JSON_BUILD_OBJECT(
                        'name', shift_name,
                        'start_time', start_time,
                        'end_time', end_time
                    ) AS shift_details,
                    JSON_AGG(
                        JSON_BUILD_OBJECT(
                        'punch_date', punch_date,
                        'entry_time', entry_time,
                        'exit_time', exit_time,
                        'hours_worked', hours_worked,
                        'expected_hours', expected_hours,
                        'status', status,
                        'late_time', late_time,
                        'early_exit_before', early_exit_before,
                        'late_start_time', late_start_time,
                        'late_hours', late_hours,
                        'early_exit_time', early_exit_time,
                        'early_exit_hours', early_exit_hours
                        ) ORDER BY punch_date
                    ) AS attendance_records
                FROM attendance_data
                GROUP BY user_uuid, employee_name, shift_name, start_time, end_time
                ORDER BY employee_name;
              `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
