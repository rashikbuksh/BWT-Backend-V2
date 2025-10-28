import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { AbsentSummaryReportRoute, DailyAbsentReportRoute } from './routes';

export const dailyAbsentReport: AppRouteHandler<DailyAbsentReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date, department_uuid } = c.req.valid('query');

  // choose from/to expressions for SQL interpolation
  const fromDateExpr = from_date ? sql`${from_date}` : sql`CURRENT_DATE`;
  const toDateExpr = to_date ? sql`${to_date}` : (from_date ? sql`${from_date}` : sql`CURRENT_DATE`);

  const query = sql`
                    WITH date_series AS (
                      SELECT generate_series(${fromDateExpr}::date, ${toDateExpr}::date, INTERVAL '1 day')::date AS punch_date
                    ),
                    user_dates AS (
                      SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
                      FROM hr.users u
                      CROSS JOIN date_series d
                    ),
                    attendance_data AS (
                      SELECT
                        e.uuid,
                        ud.user_uuid,
                        ud.employee_name,
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
                          THEN (EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::float8
                          ELSE NULL
                        END AS late_hours,
                        CASE WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN
                                    s.early_exit_before::time - MAX(pl.punch_time)::time
                        END AS early_exit_time,
                        CASE 
                            WHEN MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN
                                (EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::float8
                            ELSE NULL
                        END AS early_exit_hours,
                        CASE 
                            WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
                                (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8
                            ELSE NULL
                        END AS hours_worked,
                        CASE
                            WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date))
                              OR (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date))
                              OR hr.is_employee_off_day(e.uuid, ud.punch_date) = TRUE
                              OR hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 0
                            ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                        END AS expected_hours,
                        CASE
                            WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date)) THEN 'Holiday'
                            WHEN (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date)) THEN 'Holiday'
                            WHEN hr.is_employee_off_day(e.uuid, ud.punch_date) = TRUE THEN 'Off Day'
                            WHEN hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 'Leave'
                            WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                            WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(e.uuid, ud.punch_date)=false THEN 'Late'
                            WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(e.uuid, ud.punch_date)=true THEN 'Late (Approved)'
                            WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                            ELSE 'Present'
                        END as status,
                        dept.department AS department_name,
                        des.designation AS designation_name,
                        et.name AS employment_type_name,
                        e.employee_id,
                        line_manager.name AS line_manager_name,
                        workplace.name AS workplace_name,
                        e.profile_picture,
                        e.start_date,
                        sg.name AS shift_group_name,
                        COALESCE(sg_sel.off_days::jsonb, '[]'::jsonb) AS off_days
                      FROM hr.employee e
                      LEFT JOIN
                        hr.workplace ON e.workplace_uuid = workplace.uuid
                      LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                      LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                      LEFT JOIN LATERAL (
                                          SELECT r.shifts_uuid AS shifts_uuid,
                                                r.shift_group_uuid AS shift_group_uuid,
                                                r.off_days
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
                            ) AS sg_sel ON TRUE
                      LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                      LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
                      LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                      LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
                      LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                      LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                      LEFT JOIN hr.users line_manager ON e.line_manager_uuid = line_manager.uuid
                      WHERE 
                        ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`} 
                        ${department_uuid !== 'undefined' && department_uuid ? sql` AND dept.uuid = ${department_uuid}` : sql``}  AND e.start_date::date <= ${toDateExpr}::date
                      GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, dept.department, des.designation, et.name, e.uuid, e.employee_id, line_manager.name, workplace.name, e.profile_picture, e.start_date, sg.name, sg_sel.off_days::jsonb
                    )
                    SELECT
                          uuid,
                          user_uuid,
                          employee_name,
                          department_name,
                          designation_name,
                          employment_type_name, 
                          employee_id,
                          line_manager_name,
                          shift_name,
                          start_time,
                          end_time,
                          punch_date,
                          workplace_name,
                          profile_picture,
                          start_date,
                          shift_group_name,
                          off_days,
                          (
                              SELECT MAX(t.d)
                              FROM (
                                SELECT
                                  DATE(pl2.punch_time) AS d,
                                  MIN(pl2.punch_time) AS first_punch,
                                  s.late_time
                                FROM hr.punch_log pl2
                                LEFT JOIN LATERAL (
                                  SELECT r.shifts_uuid AS shifts_uuid,
                                        r.shift_group_uuid AS shift_group_uuid
                                  FROM hr.roster r
                                  WHERE r.shift_group_uuid = (
                                    SELECT el.type_uuid
                                    FROM hr.employee_log el
                                    WHERE el.employee_uuid = pl2.employee_uuid
                                      AND el.type = 'shift_group'
                                      AND el.effective_date::date <= DATE(pl2.punch_time)::date
                                    ORDER BY el.effective_date DESC
                                    LIMIT 1
                                  )
                                  AND r.effective_date::date <= DATE(pl2.punch_time)::date
                                  ORDER BY r.effective_date DESC
                                  LIMIT 1
                                ) AS sg_sel ON TRUE
                                LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                                LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
                                WHERE pl2.employee_uuid = attendance_data.uuid
                                  AND (SELECT is_general_holiday FROM hr.is_general_holiday(DATE(pl2.punch_time))) IS false
                                  AND (SELECT is_special_holiday FROM hr.is_special_holiday(DATE(pl2.punch_time))) IS false
                                  AND hr.is_employee_off_day(attendance_data.uuid, DATE(pl2.punch_time)) = false
                                  AND hr.is_employee_on_leave(attendance_data.uuid, DATE(pl2.punch_time)) = false
                                  AND DATE(pl2.punch_time) <= CURRENT_DATE
                                GROUP BY DATE(pl2.punch_time), s.late_time
                              ) AS t
                              WHERE (t.first_punch::time <= t.late_time::time
                                    OR (t.first_punch::time <= t.late_time::time
                                        AND hr.is_employee_applied_late(attendance_data.uuid, t.d) = true))
                            ) AS last_present,

                         (
                            SELECT GREATEST(
                              DATE(attendance_data.start_date),
                              COALESCE(
                                (
                                  SELECT MAX(days.d)
                                  FROM (
                                    SELECT generate_series(
                                      CURRENT_DATE - INTERVAL '29 days',
                                      CURRENT_DATE - INTERVAL '1 day',  -- end before today
                                      '1 day'
                                    )::date AS d
                                  ) AS days
                                  WHERE NOT EXISTS (
                                    SELECT 1 FROM hr.punch_log pl4
                                    WHERE pl4.employee_uuid = attendance_data.uuid
                                      AND DATE(pl4.punch_time) = days.d
                                  )
                                  AND hr.is_employee_on_leave(attendance_data.uuid, days.d) = false
                                  AND (SELECT is_general_holiday FROM hr.is_general_holiday(days.d)) IS false
                                  AND (SELECT is_special_holiday FROM hr.is_special_holiday(days.d)) IS false
                                  AND hr.is_employee_off_day(attendance_data.uuid, days.d) = false
                                ),
                                DATE(attendance_data.start_date)
                              )
                            )
                          ) AS last_absent_last_30_days,

                        (
                          SELECT COUNT(*)
                          FROM (
                            SELECT generate_series(
                              GREATEST(CURRENT_DATE - INTERVAL '29 days', DATE(attendance_data.start_date)),
                              CURRENT_DATE - INTERVAL '1 day',   -- end before today
                              '1 day'
                            )::date AS d
                          ) AS days
                          LEFT JOIN hr.punch_log pl3
                            ON pl3.employee_uuid = attendance_data.uuid
                            AND DATE(pl3.punch_time) = days.d
                          WHERE pl3.employee_uuid IS NULL
                            AND (SELECT is_general_holiday FROM hr.is_general_holiday(days.d)) IS false
                            AND (SELECT is_special_holiday FROM hr.is_special_holiday(days.d)) IS false
                            AND hr.is_employee_off_day(attendance_data.uuid, days.d) = false
                            AND hr.is_employee_on_leave(attendance_data.uuid, days.d) = false
                        ) AS absent_last_30_days_count
                        FROM attendance_data
                        WHERE status = 'Absent'
                        GROUP BY uuid, user_uuid, employee_name, shift_name, department_name, designation_name, employment_type_name, employee_id, line_manager_name, start_time, end_time, punch_date, workplace_name, profile_picture, start_date, shift_group_name, off_days
                        ORDER BY employee_name;
                  `;

  const data = await db.execute(query);
  const processedData = data.rows;

  return c.json(processedData, HSCode.OK);
};

export const absentSummaryReport: AppRouteHandler<AbsentSummaryReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date, department_uuid } = c.req.valid('query');

  // const holidays = await getHolidayCountsDateRange(from_date, to_date);

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
                    ud.user_uuid,
                    ud.employee_name,
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
                      THEN (EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::float8
                      ELSE NULL
                    END AS late_hours,
                    CASE WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN
                                s.early_exit_before::time - MAX(pl.punch_time)::time
                    END AS early_exit_time,
                    CASE 
                        WHEN MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN
                            (EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::float8
                        ELSE NULL
                    END AS early_exit_hours,
                    CASE 
                        WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
                            (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8
                        ELSE NULL
                    END AS hours_worked,
                    CASE
                        WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date))
                          OR (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date))
                          OR hr.is_employee_off_day(e.uuid, ud.punch_date) = TRUE
                          OR hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 0
                        ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                    END AS expected_hours,
                    CASE
                        WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date)) THEN 'Holiday'
                        WHEN (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date)) THEN 'Holiday'
                        WHEN hr.is_employee_off_day(e.uuid, ud.punch_date) = TRUE THEN 'Off Day'
                        WHEN hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 'Leave'
                        WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                        WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(e.uuid, ud.punch_date)=false THEN 'Late'
                        WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(e.uuid, ud.punch_date)=true THEN 'Late (Approved)'
                        WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                        ELSE 'Present'
                    END as status,
                    dept.department AS department_name,
                    des.designation AS designation_name,
                    et.name AS employment_type_name,
                    e.employee_id,
                    line_manager.name AS line_manager_name,
                    sg.name AS shift_group_name,
                    e.profile_picture,
                    e.start_date,
                    COALESCE(sg_sel.off_days::jsonb, '[]'::jsonb) AS off_days
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                  LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                  LEFT JOIN LATERAL (
                                      SELECT r.shifts_uuid AS shifts_uuid,
                                            r.shift_group_uuid AS shift_group_uuid,
                                            r.off_days
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
                          ) AS sg_sel ON TRUE
                  LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                  LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
                  LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                  LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
                  LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                  LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                  LEFT JOIN hr.users line_manager ON e.line_manager_uuid = line_manager.uuid
                  WHERE 
                    ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`} 
                    ${department_uuid !== 'undefined' && department_uuid ? sql` AND dept.uuid = ${department_uuid}` : sql``}
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, dept.department, des.designation, et.name, e.uuid, e.employee_id, line_manager.name, sg.name, e.profile_picture, e.start_date, sg_sel.off_days::jsonb
                )
                SELECT
                    uuid,
                    user_uuid,
                    employee_name,
                    department_name,
                    designation_name,
                    employment_type_name, 
                    employee_id,
                    line_manager_name,
                    profile_picture,
                    start_date,
                    COALESCE(
                            JSON_AGG(
                              JSON_BUILD_OBJECT(
                                'shift_name', shift_name,
                                'start_time', start_time,
                                'end_time', end_time,
                                'punch_date', punch_date,
                                'shift_group_name', shift_group_name,
                                'off_days', off_days
                              )
                              ORDER BY punch_date
                            ) FILTER (
                              WHERE shift_name IS NOT NULL
                                OR start_time IS NOT NULL
                                OR end_time IS NOT NULL
                                OR shift_group_name IS NOT NULL
                            ),
                            '[]'::json
                          ) AS absent_days
                FROM attendance_data
                WHERE status = 'Absent'
                GROUP BY uuid, user_uuid, employee_name, department_name, designation_name, employment_type_name, employee_id, line_manager_name, profile_picture, start_date
                ORDER BY employee_name;
              `;
  const data = await db.execute(query);

  const processedData = data.rows;

  return c.json(processedData, HSCode.OK);
};
