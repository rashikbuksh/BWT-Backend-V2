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
                    e.profile_picture,
                    e.start_date:date,
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
                      WHEN gh.date IS NOT NULL OR sp.is_special = 1 THEN 'Holiday'
                      WHEN hr.is_employee_off_day(e.uuid, ud.punch_date)=true THEN 'Off Day'
                      WHEN al.reason IS NOT NULL THEN 'Leave'
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
                  LEFT JOIN LATERAL (
                                    SELECT 
                                        r.shifts_uuid AS shifts_uuid,
                                        r.shift_group_uuid AS shift_group_uuid
                                    FROM hr.roster r
                                    WHERE r.shift_group_uuid = (
                                      SELECT el.type_uuid
                                      FROM hr.employee_log el
                                      WHERE el.employee_uuid = e.uuid
                                        AND el.type = 'shift_group'
                                        AND el.effective_date::date <= ud.punch_date::date
                                      ORDER BY el.effective_date DESC
                                      LIMIT 1
                                    )
                                    AND r.effective_date::date <= ud.punch_date::date
                                    ORDER BY r.effective_date DESC
                                    LIMIT 1
                                  ) sg_sel ON TRUE
                  LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                  LEFT JOIN hr.shift_group ON shift_group.uuid = sg_sel.shift_group_uuid
                  LEFT JOIN hr.general_holidays gh ON gh.date::date = ud.punch_date::date
                  LEFT JOIN LATERAL (
                    SELECT 1 AS is_special
                    FROM hr.special_holidays sh
                    WHERE ud.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                    LIMIT 1
                  ) AS sp ON TRUE
                  LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid
                    AND ud.punch_date BETWEEN al.from_date::date AND al.to_date::date
                    AND al.approval = 'approved'
                  WHERE 
                    ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before,e.employee_id,d.department, des.designation, e.uuid,
                    gh.date, sp.is_special, al.reason, e.profile_picture, e.start_date:date
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
                        'late_hours',    ad.late_hours,
                        'profile_picture', ad.profile_picture,
                        'start_date',    ad.start_date:date
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
                    e.uuid,
                    e.profile_picture,
                    e.start_date:date,
                    ud.user_uuid,
                    ud.employee_name,
                    e.employee_id AS employee_id,
                    d.department AS employee_department,
                    des.designation AS employee_designation,
                    CASE WHEN e.line_manager_uuid IS NOT NULL THEN lm.name ELSE 'Not Set' END AS line_manager,
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
                      WHEN gh.date IS NOT NULL OR sp.is_special = 1 THEN 'Holiday'
                      WHEN hr.is_employee_off_day(e.uuid, ud.punch_date)=true THEN 'Off Day'
                      WHEN al.reason IS NOT NULL THEN 'Leave'
                      WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                      WHEN MIN(pl.punch_time)::time > s.late_time::time THEN 'Late'
                      WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                      ELSE 'Present'
                    END as status,
                    CASE 
                        WHEN alm.status IS NULL
                            THEN 'Not Applied'
                        ELSE 
                            alm.status::text
                    END AS late_application_status
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                  LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                  LEFT JOIN hr.department d ON u.department_uuid = d.uuid
                  LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                  LEFT JOIN hr.users lm ON e.line_manager_uuid = lm.uuid
                  LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                  LEFT JOIN LATERAL (
                                  SELECT 
                                      r.shifts_uuid AS shifts_uuid,
                                      r.shift_group_uuid AS shift_group_uuid
                                  FROM hr.roster r
                                  WHERE r.shift_group_uuid = (
                                    SELECT el.type_uuid
                                    FROM hr.employee_log el
                                    WHERE el.employee_uuid = e.uuid
                                      AND el.type = 'shift_group'
                                      AND el.effective_date::date <= ud.punch_date::date
                                    ORDER BY el.effective_date DESC
                                    LIMIT 1
                                  )
                                  AND r.effective_date::date <= ud.punch_date::date
                                  ORDER BY r.effective_date DESC
                                  LIMIT 1
                                ) sg_sel ON TRUE
                  LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                  LEFT JOIN hr.shift_group ON shift_group.uuid = sg_sel.shift_group_uuid
                  LEFT JOIN hr.general_holidays gh ON gh.date::date = ud.punch_date::date
                  LEFT JOIN LATERAL (
                    SELECT 1 AS is_special
                    FROM hr.special_holidays sh
                    WHERE ud.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                    LIMIT 1
                  ) AS sp ON TRUE
                  LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid
                    AND ud.punch_date BETWEEN al.from_date::date AND al.to_date::date
                    AND al.approval = 'approved'
                  LEFT JOIN hr.apply_late alm ON e.uuid = alm.employee_uuid
                    AND ud.punch_date = alm.date::date
                  WHERE 
                    ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, e.employee_id, d.department, des.designation, e.uuid, lm.name, e.profile_picture, gh.date, sp.is_special, al.reason, alm.status, e.start_date:date
                ),
                  monthly_late AS (
                                SELECT
                                    ad.uuid AS employee_uuid,
                                    COUNT(*) AS total_late_days,
                                    SUM(EXTRACT(EPOCH FROM ad.late_start_time)) AS total_late_seconds
                                FROM attendance_data ad
                                WHERE ad.status = 'Late'
                                    AND date_trunc('month', ad.punch_date) = date_trunc('month', ${from_date}::date)
                                GROUP BY ad.uuid
                )
                SELECT DISTINCT
                    uuid AS employee_uuid,
                    profile_picture,
                    start_date:date,
                    user_uuid AS employee_user_uuid,
                    employee_name,
                    employee_id,
                    employee_department,
                    employee_designation,
                    shift_name,
                    start_time,
                    end_time,
                    entry_time::time,
                    exit_time::time,
                    early_exit_time,
                    early_exit_hours,
                    late_hours,
                    late_start_time,
                    late_application_status,
                    expected_hours,
                    hours_worked,
                    punch_date AS date,
                    status,
                    COALESCE(ml.total_late_days, 0) AS monthly_late_count,
                    CONCAT(
                      FLOOR(ml.total_late_seconds/3600)::int, 'h ',
                      FLOOR((ml.total_late_seconds%3600)/60)::int, 'm'
                    ) AS total_late_hours
                FROM attendance_data
               LEFT JOIN monthly_late ml
                    ON uuid = ml.employee_uuid
                WHERE status = 'Late'
                ORDER BY employee_name;
              `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};
