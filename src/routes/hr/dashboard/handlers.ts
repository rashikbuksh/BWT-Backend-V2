import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { getHolidayCountsDateRange } from '@/lib/variables';

// import { createApi } from '@/utils/api';
import type { GetAttendanceReportRoute, GetLateEmployeeAttendanceReportRoute, GetMonthlyAttendanceReportRoute, GetOnLeaveEmployeeAttendanceReportRoute } from './routes';

export const getLateEmployeeAttendanceReport: AppRouteHandler<GetLateEmployeeAttendanceReportRoute> = async (c: any) => {
  const { employee_uuid, date } = c.req.valid('query');

  // single-day data (today) for all returned fields
  const from_day = date ? sql`${date}::date` : sql`CURRENT_DATE::date`;
  const to_day = date ? sql`${date}::date` : sql`CURRENT_DATE::date`;

  // month range (first of month .. today) used only to compute total_late_in_month
  const from_month = sql`date_trunc('month', CURRENT_DATE)::date`;
  const to_month = sql`CURRENT_DATE`;

  const query = sql`
                      WITH
                      -- day series (today)
                      date_series_day AS (
                        SELECT generate_series(${from_day}::date, ${to_day}::date, INTERVAL '1 day')::date AS punch_date
                      ),
                      user_dates_day AS (
                        SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
                        FROM hr.users u
                        CROSS JOIN date_series_day d
                      ),

                      -- month series (1st .. today) for month totals
                      date_series_month AS (
                        SELECT generate_series(${from_month}::date, ${to_month}::date, INTERVAL '1 day')::date AS punch_date
                      ),
                      user_dates_month AS (
                        SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
                        FROM hr.users u
                        CROSS JOIN date_series_month d
                      ),
                      -- attendance for day (today) - used to return rows (all fields filtered to today)
                      attendance_data_day AS (
                        SELECT
                          e.uuid,
                          e.profile_picture,
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
                                OR hr.is_employee_off_day(e.uuid, ud.punch_date)=true
                                OR hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 0
                            ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                          END AS expected_hours,
                          CASE
                              WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date))
                                  OR (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date)) THEN 'Holiday'
                              WHEN hr.is_employee_off_day(e.uuid, ud.punch_date)=true THEN 'Off Day'
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
                          lineManager.name AS line_manager_name
                        FROM hr.employee e
                        LEFT JOIN user_dates_day ud ON e.user_uuid = ud.user_uuid
                        LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                        LEFT JOIN LATERAL (
                                              SELECT
                                                  r.shifts_uuid AS shifts_uuid,
                                                  r.shift_group_uuid AS shift_group_uuid
                                              FROM hr.roster r
                                              WHERE r.shift_group_uuid = (SELECT el.type_uuid FROM hr.employee_log el WHERE el.type = 'shift_group' AND el.employee_uuid=e.uuid AND el.effective_date::date <=  ud.punch_date::date ORDER BY el.effective_date DESC LIMIT 1)
                                                AND r.effective_date::date <= ud.punch_date::date
                                              ORDER BY r.effective_date DESC
                                              LIMIT 1
                                            ) AS sg_sel ON TRUE
                        LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                        LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                        LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
                        LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                        LEFT JOIN hr.users lineManager ON e.line_manager_uuid = lineManager.uuid
                        LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                        WHERE ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                        GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before,dept.department, des.designation, et.name, e.uuid, lineManager.name, e.profile_picture
                      ),

                      -- attendance for month range (1st .. today) used only to compute total late count per user
                      attendance_data_month AS (
                        SELECT
                          e.uuid,
                          ud.user_uuid,
                          DATE(ud.punch_date) AS punch_date,
                          MIN(pl.punch_time) AS entry_time,
                          MAX(pl.punch_time) AS exit_time,
                          s.late_time,
                          s.early_exit_before,
                          CASE
                            WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date)) OR (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date)) THEN 'Holiday'
                            WHEN hr.is_employee_off_day(e.uuid, ud.punch_date)=true THEN 'Off Day'
                            WHEN hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 'Leave'
                            WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                            WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(e.uuid, ud.punch_date)=false THEN 'Late'
                              WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(e.uuid, ud.punch_date)=true THEN 'Late (Approved)'
                            WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                            ELSE 'Present'
                          END as status
                        FROM hr.employee e
                        LEFT JOIN user_dates_month ud ON e.user_uuid = ud.user_uuid
                        LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                        LEFT JOIN LATERAL (
                                              SELECT
                                                  r.shifts_uuid AS shifts_uuid,
                                                  r.shift_group_uuid AS shift_group_uuid
                                              FROM hr.roster r
                                              WHERE r.shift_group_uuid = (SELECT el.type_uuid FROM hr.employee_log el WHERE el.type = 'shift_group' AND el.employee_uuid=e.uuid AND el.effective_date::date <=  ud.punch_date::date ORDER BY el.effective_date DESC LIMIT 1)
                                                AND r.effective_date::date <= ud.punch_date::date
                                              ORDER BY r.effective_date DESC
                                              LIMIT 1
                                            ) AS sg_sel ON TRUE
                        LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                        WHERE ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                        GROUP BY ud.user_uuid, ud.punch_date, s.late_time, s.early_exit_before, e.uuid
                      ),

                      -- precompute month late counts per user
                      month_late_counts AS (
                        SELECT user_uuid, COUNT(*) AS total_late_in_month
                        FROM attendance_data_month
                        WHERE status = 'Late'
                        GROUP BY user_uuid
                      )

                      SELECT
                        ad.uuid as employee_uuid,
                        ad.profile_picture,
                        ad.user_uuid,
                        ad.employee_name,
                        ad.shift_name,
                        ad.department_name,
                        ad.designation_name,
                        ad.employment_type_name,
                        ad.start_time,
                        ad.end_time,
                        ad.punch_date,
                        ad.entry_time,
                        ad.exit_time,
                        ad.hours_worked,
                        ad.expected_hours,
                        ad.status,
                        ad.late_time,
                        ad.early_exit_before,
                        ad.late_start_time,
                        ad.late_hours,
                        ad.early_exit_time,
                        ad.early_exit_hours,
                        ad. line_manager_name,
                        COALESCE(ml.total_late_in_month, 0)::int AS total_late_in_month
                      FROM attendance_data_day ad
                      LEFT JOIN month_late_counts ml ON ml.user_uuid = ad.user_uuid
                      WHERE ad.punch_date BETWEEN ${from_day}::date AND ${to_day}::date
                        AND ad.status = 'Late'
                      ORDER BY ad.employee_name, ad.punch_date;
                    `;

  const lateEmployeeAttendanceReportPromise = db.execute(query);

  const data = await lateEmployeeAttendanceReportPromise;

  return c.json(data.rows || [], HSCode.OK);
};

export const getAttendanceReport: AppRouteHandler<GetAttendanceReportRoute> = async (c: any) => {
  const { department_uuid, date } = c.req.valid('query');

  const from_date = date;
  const to_date = date;

  const query = sql`
                    WITH 
                    -- 1) every date in the range
                    date_series AS (
                        SELECT generate_series(${from_date}::date, ${to_date}::date, INTERVAL '1 day')::date AS punch_date
                    ), 
                    -- 2) only employees in this department
                    dept_employees AS (
                        SELECT 
                            e.uuid AS employee_uuid,
                            u.uuid AS user_uuid,
                            u.name AS employee_name
                        FROM hr.employee e
                        JOIN hr.users u ON e.user_uuid = u.uuid
                        WHERE ${department_uuid ? sql`u.department_uuid = ${department_uuid}` : sql`TRUE`}
                    ), 
                    -- 3) summary per employee
                    summary_data AS (
                        SELECT 
                            e.uuid AS employee_uuid,
                            u.uuid AS user_uuid,
                            u.name AS employee_name,
                            d.uuid AS designation_uuid,
                            d.designation AS designation_name,
                            dep.uuid AS department_uuid,
                            dep.department AS department_name,
                            w.uuid AS workplace_uuid,
                            w.name AS workplace_name,
                            et.uuid AS employment_type_uuid,
                            et.name AS employment_type_name,
                            COALESCE(attendance_summary.present_days, 0)::float8 + COALESCE(attendance_summary.late_days, 0)::float8 AS present_days,
                            (
                                ( (${to_date}::date - GREATEST(${from_date}::date, e.start_date::date)) + 1 )::int
                              ) - (
                                COALESCE(attendance_summary.present_days, 0) + 
                                COALESCE(attendance_summary.late_days, 0) + 
                                hr.get_total_leave_days(e.uuid, GREATEST(${from_date}::date, e.start_date::date), ${to_date}::date) + 
                                hr.get_general_holidays_count(GREATEST(${from_date}::date, e.start_date::date), ${to_date}::date) + 
                                hr.get_special_holidays_count(GREATEST(${from_date}::date, e.start_date::date), ${to_date}::date) +
                                hr.get_offday_count(e.uuid, GREATEST(${from_date}::date, e.start_date::date), ${to_date}::date)
                            )::float8 AS absent_days,
                            hr.get_total_leave_days(e.uuid, GREATEST(${from_date}::date, e.start_date::date), ${to_date}::date)::float8 AS leave_days,
                            COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
                            COALESCE(attendance_summary.early_exit_days, 0)::float8 AS early_exit_days,
                            hr.get_offday_count(e.uuid, GREATEST(${from_date}::date, e.start_date::date), ${to_date}::date)::float8 AS off_days,
                            s.name AS shift_name,
                            s.start_time AS shift_start_time,
                            s.end_time AS shift_end_time
                        FROM hr.employee e
                        LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                        LEFT JOIN hr.designation d ON u.designation_uuid = d.uuid
                        LEFT JOIN hr.department dep ON u.department_uuid = dep.uuid
                        LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
                        LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                        LEFT JOIN LATERAL (
                                        SELECT
                                            r.shifts_uuid AS shifts_uuid,
                                            r.shift_group_uuid AS shift_group_uuid
                                        FROM hr.roster r
                                        WHERE r.shift_group_uuid = (SELECT el.type_uuid FROM hr.employee_log el WHERE el.type = 'shift_group' AND el.employee_uuid=e.uuid AND el.effective_date::date <=  ${date}::date ORDER BY el.effective_date DESC LIMIT 1)
                                          AND r.effective_date::date <= ${date}::date
                                        ORDER BY r.effective_date DESC
                                        LIMIT 1
                                    ) AS sg_sel ON TRUE
                        LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                        LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
                        LEFT JOIN (
                            WITH daily_attendance AS (
                                SELECT 
                                    pl.employee_uuid,
                                    DATE(pl.punch_time) AS attendance_date,
                                    MIN(pl.punch_time) AS first_punch,
                                    MAX(pl.punch_time) AS last_punch,
                                    shifts.late_time,
                                    shifts.early_exit_before,
                                    (SELECT el.type_uuid
                                     FROM hr.employee_log el
                                     WHERE el.employee_uuid = pl.employee_uuid
                                     AND el.type = 'shift_group' AND el.effective_date::date <= ${date}::date
                                      ORDER BY el.effective_date DESC
                                      LIMIT 1) AS shift_group_uuid
                                FROM hr.punch_log pl
                                LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                                LEFT JOIN LATERAL (
                                                  SELECT
                                                      r.shifts_uuid AS shifts_uuid,
                                                      r.shift_group_uuid AS shift_group_uuid
                                                  FROM hr.roster r
                                                  WHERE r.shift_group_uuid = (SELECT el.type_uuid FROM hr.employee_log el WHERE el.type = 'shift_group' AND el.employee_uuid= e.uuid AND el.effective_date::date <=  ${date}::date ORDER BY el.effective_date DESC LIMIT 1)
                                                    AND r.effective_date::date <= ${date}::date
                                                  ORDER BY r.effective_date DESC
                                                  LIMIT 1
                                              ) AS sg_sel ON TRUE
                                LEFT JOIN hr.shifts shifts ON shifts.uuid = sg_sel.shifts_uuid
                                LEFT JOIN hr.shift_group ON shift_group.uuid = sg_sel.shift_group_uuid
                                WHERE pl.punch_time IS NOT NULL
                                      AND DATE(pl.punch_time) >= GREATEST(${from_date}::date, e.start_date::date)
                                      AND DATE(pl.punch_time) <= ${to_date}::date
                                GROUP BY pl.employee_uuid, DATE(pl.punch_time), shifts.late_time, shifts.early_exit_before, shift_group_uuid
                            )
                            SELECT 
                                da.employee_uuid,
                                COUNT(
                                    CASE
                                        WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(da.attendance_date)) IS false  
                                          AND (SELECT is_special_holiday FROM hr.is_special_holiday(da.attendance_date)) IS false
                                          AND  hr.is_employee_off_day(da.employee_uuid,da.attendance_date)=false
                                          AND hr.is_employee_on_leave(da.employee_uuid, da.attendance_date)=false
                                          AND ((da.first_punch::time < da.late_time::time) OR (hr.is_employee_applied_late(da.employee_uuid, da.attendance_date) = true))
                                        THEN 1 ELSE NULL
                                      END
                                ) AS present_days,
                                COUNT(
                                     CASE 
                                        WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(da.attendance_date)) IS false
                                            AND (SELECT is_special_holiday FROM hr.is_special_holiday(da.attendance_date)) IS false
                                            AND  hr.is_employee_off_day(da.employee_uuid,da.attendance_date)=false
                                            AND hr.is_employee_on_leave(da.employee_uuid, da.attendance_date)=false
                                            AND  hr.is_employee_applied_late(da.employee_uuid, da.attendance_date)=false
                                            AND da.first_punch::time >= da.late_time::time THEN 1
                                        ELSE NULL
                                    END
                                ) AS late_days,
                                COUNT(
                                    CASE 
                                        WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(da.attendance_date)) IS false
                                            AND (SELECT is_special_holiday FROM hr.is_special_holiday(da.attendance_date)) IS false
                                            AND hr.is_employee_off_day(da.employee_uuid,da.attendance_date)=false
                                            AND hr.is_employee_on_leave(da.employee_uuid, da.attendance_date)=false
                                            AND da.last_punch::time <= da.early_exit_before::time THEN 1
                                        ELSE NULL
                                    END
                                ) AS early_exit_days
                            FROM daily_attendance da
                            GROUP BY employee_uuid
                        ) AS attendance_summary ON e.uuid = attendance_summary.employee_uuid
                        WHERE ${department_uuid ? sql`u.department_uuid = ${department_uuid}` : sql`TRUE`}
                    ), 
                    -- 4) detailed date-wise per employee
                    attendance_data AS (
                        SELECT de.employee_uuid,
                            de.user_uuid,
                            de.employee_name,
                            ds.punch_date,
                            MIN(pl.punch_time) AS entry_time,
                            MAX(pl.punch_time) AS exit_time,
                            CASE
                                WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN (
                                    EXTRACT(EPOCH FROM MAX(pl.punch_time)::time - MIN(pl.punch_time)::time) / 3600
                                )::float8
                                ELSE NULL
                            END AS hours_worked,
                            CASE 
                                WHEN MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN 
                                    (EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::float8
                                ELSE NULL
                            END AS early_exit_hours,
                            CASE 
                                WHEN MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time > s.late_time::time THEN 
                                    (EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::float8
                                ELSE NULL
                            END AS late_hours,
                            CASE
                                WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ds.punch_date))
                                  OR (SELECT is_special_holiday FROM hr.is_special_holiday(ds.punch_date))
                                  OR hr.is_employee_off_day(de.employee_uuid, ds.punch_date)=true
                                  OR hr.is_employee_on_leave(de.employee_uuid, ds.punch_date)=true THEN 0
                                ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                            END AS expected_hours,
                            CASE
                                WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ds.punch_date))
                                  OR (SELECT is_special_holiday FROM hr.is_special_holiday(ds.punch_date)) THEN 'Holiday'
                                WHEN hr.is_employee_off_day(de.employee_uuid, ds.punch_date)=true THEN 'Off Day'
                                WHEN hr.is_employee_on_leave(de.employee_uuid, ds.punch_date)=true THEN 'Leave'
                                WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                                WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(de.employee_uuid, ds.punch_date)=false THEN 'Late'
                                WHEN (MIN(pl.punch_time)::time > s.late_time::time) AND hr.is_employee_applied_late(de.employee_uuid, ds.punch_date)=true THEN 'Late (Approved)'
                                WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                                ELSE 'Present'
                            END as status,
                            al.reason AS leave_reason
                        FROM dept_employees de
                        CROSS JOIN date_series ds
                        LEFT JOIN hr.punch_log pl ON pl.employee_uuid = de.employee_uuid AND DATE(pl.punch_time) = ds.punch_date
                        LEFT JOIN LATERAL (
                                              SELECT
                                                  r.shifts_uuid AS shifts_uuid,
                                                  r.shift_group_uuid AS shift_group_uuid
                                              FROM hr.roster r
                                              WHERE r.shift_group_uuid = (SELECT el.type_uuid FROM hr.employee_log el WHERE el.type = 'shift_group' AND el.employee_uuid=de.employee_uuid AND el.effective_date::date <=  ds.punch_date::date ORDER BY el.effective_date DESC LIMIT 1)
                                                AND r.effective_date::date <= ds.punch_date::date
                                              ORDER BY r.effective_date DESC
                                              LIMIT 1
                                            ) AS sg_sel ON TRUE
                        LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                        LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
                        LEFT JOIN hr.apply_leave al ON al.employee_uuid = de.employee_uuid
                            AND ds.punch_date BETWEEN al.from_date::date AND al.to_date::date
                            AND al.approval = 'approved'
                        GROUP BY de.employee_uuid, de.user_uuid, de.employee_name, ds.punch_date, s.start_time, s.end_time,al.employee_uuid, al.reason, s.late_time, s.early_exit_before
                    )
                    -- 5) final SELECT
                    SELECT 
                        sd.*, 
                        ad.punch_date, 
                        ad.entry_time, 
                        ad.exit_time, 
                        ad.hours_worked, 
                        ad.expected_hours, 
                        ad.early_exit_hours,
                        ad.late_hours,
                        ad.status, 
                        ad.leave_reason
                    FROM
                        summary_data sd
                        LEFT JOIN attendance_data ad ON sd.employee_uuid = ad.employee_uuid
                    `;

  const data = await db.execute(query);

  return c.json(data.rows || [], HSCode.OK);
};

export const getMonthlyAttendanceReport: AppRouteHandler<GetMonthlyAttendanceReportRoute> = async (c: any) => {
  const { from_date, to_date, employee_uuid } = c.req.valid('query');

  const holidays = await getHolidayCountsDateRange(from_date, to_date);

  // Simplified monthly attendance query
  const query = sql`
                  WITH sg_off_days AS (
                            WITH params AS (
                                SELECT ${from_date}::date AS start_date, ${to_date}::date AS end_date
                            ),
                            shift_group_periods AS (
                                SELECT sg.uuid AS shift_group_uuid,
                                    sg.effective_date,
                                    sg.off_days::JSONB AS off_days,
                                    LEAD(sg.effective_date) OVER (PARTITION BY sg.uuid ORDER BY sg.effective_date) AS next_effective_date
                                FROM hr.shift_group sg
                                CROSS JOIN params p
                                WHERE sg.effective_date <= p.end_date
                            ),
                            date_ranges AS (
                                SELECT shift_group_uuid,
                                    GREATEST(effective_date, (SELECT start_date FROM params)) AS period_start,
                                    LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params)) AS period_end,
                                    off_days
                                FROM shift_group_periods
                                WHERE GREATEST(effective_date, (SELECT start_date FROM params)) <= LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params))
                            ),
                            all_days AS (
                                SELECT dr.shift_group_uuid,
                                    gs::date AS day,
                                    dr.off_days
                                FROM date_ranges dr
                                CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS gs
                            ),
                            expanded AS (
                                SELECT shift_group_uuid,
                                    day,
                                    TRUE AS is_offday
                                FROM all_days
                                CROSS JOIN LATERAL jsonb_array_elements_text(off_days) AS od(dname)
                                WHERE lower(to_char(day, 'Dy')) = lower(od.dname)
                            )
                            SELECT * FROM expanded
                     )
                    SELECT
                          e.uuid AS employee_uuid,
                          u.uuid AS user_uuid,
                          u.name AS employee_name,
                          d.designation AS designation_name,
                          dep.department AS department_name,
                          w.name AS workplace_name,
                          et.name AS employment_type_name,
                          
                          -- Calculate days
                          (${to_date}::date - ${from_date}::date + 1)::float8 AS total_days,
                          COALESCE(att_summary.present_days, 0)::float8 + COALESCE(att_summary.late_days, 0)::float8 AS present_days,
                          COALESCE(att_summary.late_days, 0)::float8 AS late_days,
                          COALESCE(att_summary.early_exit_days, 0)::float8 AS early_exit_days,
                          COALESCE(leave_summary.total_leave_days, 0)::float8 AS leave_days,
                          COALESCE(off_summary.total_off_days, 0)::float8 AS off_days,
                          ${holidays.general}::float8 AS general_holidays,
                          ${holidays.special}::float8 AS special_holidays,
                          
                          -- Calculate working days
                          ((${to_date}::date - ${from_date}::date + 1) - 
                          (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_summary.total_off_days, 0) + 
                            ${holidays.general} + ${holidays.special}))::float8 AS working_days,
                            
                          -- Calculate absent days
                           ((${to_date}::date - ${from_date}::date + 1) - 
                          (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_summary.total_off_days, 0) + 
                            ${holidays.general} + ${holidays.special}))::float8 - ( COALESCE(att_summary.present_days, 0)::float8 + COALESCE(att_summary.late_days, 0)::float8) AS absent_days,
                            
                          -- Additional metrics
                          COALESCE(late_app_summary.total_late_approved, 0)::float8 AS approved_lates,
                          COALESCE(field_visit_summary.total_field_visits_days, 0)::float8 AS field_visit_days,
                          COALESCE(late_hours_summary.total_late_hours, 0)::float8 AS total_late_hours,
                          COALESCE(late_hours_summary.total_early_exit_hours, 0)::float8 AS total_early_exit_hours,
                          
                          -- Calculate working hours
                           COALESCE(late_hours_summary.total_working_hours, 0)::float8 AS working_hours,

                          -- Expected hours calculation
                          (((${to_date}::date - ${from_date}::date + 1) - 
                            (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_summary.total_off_days, 0) + 
                            ${holidays.general} + ${holidays.special})) * 8)::float8 AS expected_hours,


                         -- Overtime hours (non-negative): max(working_hours - expected_hours, 0)
                         
                          GREATEST(
                            COALESCE(late_hours_summary.total_working_hours, 0)::float8
                            -
                            (((${to_date}::date - ${from_date}::date + 1) - 
                              (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_summary.total_off_days, 0) + 
                               ${holidays.general} + ${holidays.special})) * 8)::float8,
                            0
                          )::float8 AS overtime_hours

                    FROM hr.employee e
                    LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                    LEFT JOIN hr.designation d ON u.designation_uuid = d.uuid
                    LEFT JOIN hr.department dep ON u.department_uuid = dep.uuid
                    LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
                    LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                    
                    -- Attendance summary
                   LEFT JOIN (
                            WITH daily_attendance AS (
                              SELECT 
                                pl.employee_uuid,
                                DATE(pl.punch_time) AS attendance_date,
                                MIN(pl.punch_time) AS first_punch,
                                MAX(pl.punch_time) AS last_punch,
                                s.late_time,
                                e.shift_group_uuid,
                                s.early_exit_before
                              FROM hr.punch_log pl
                              LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                              LEFT JOIN hr.shift_group sg ON e.shift_group_uuid = sg.uuid
                              LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
                              WHERE pl.punch_time IS NOT NULL 
                                AND pl.punch_time >= ${from_date}::date 
                                AND pl.punch_time <= ${to_date}::date
                              GROUP BY pl.employee_uuid, DATE(pl.punch_time), s.late_time, e.shift_group_uuid, s.early_exit_before
                            )
                            SELECT 
                              da.employee_uuid,
                              COUNT(
                                CASE 
                                  WHEN gh.date IS NULL 
                                    AND sp.is_special IS NULL 
                                    AND sod.is_offday IS DISTINCT FROM TRUE 
                                    AND da.first_punch::time < da.late_time::time THEN 1
                                  ELSE NULL
                                END
                              ) AS present_days,
                              COUNT(
                                CASE
                                  WHEN gh.date IS NULL 
                                    AND sp.is_special IS NULL 
                                    AND sod.is_offday IS DISTINCT FROM TRUE 
                                    AND da.first_punch::time > da.late_time::time THEN 1
                                  ELSE NULL
                                END
                              ) AS late_days,
                              COUNT(
                                CASE 
                                  WHEN gh.date IS NULL 
                                    AND sp.is_special IS NULL 
                                    AND sod.is_offday IS DISTINCT FROM TRUE 
                                    AND da.last_punch::time < da.early_exit_before::time THEN 1
                                  ELSE NULL
                                END
                              ) AS early_exit_days
                            FROM daily_attendance da
                            LEFT JOIN hr.general_holidays gh ON gh.date = da.attendance_date
                            LEFT JOIN LATERAL (
                              SELECT 1 AS is_special
                              FROM hr.special_holidays sh
                              WHERE da.attendance_date BETWEEN sh.from_date::date AND sh.to_date::date
                              LIMIT 1
                            ) sp ON TRUE
                            LEFT JOIN sg_off_days sod ON sod.shift_group_uuid = da.shift_group_uuid AND sod.day = da.attendance_date
                            GROUP BY da.employee_uuid
                          ) att_summary ON e.uuid = att_summary.employee_uuid
                    
                    -- Leave summary
                    LEFT JOIN (
                      SELECT
                        al.employee_uuid,
                        SUM(
                          LEAST(al.to_date::date, ${to_date}::date) - 
                          GREATEST(al.from_date::date, ${from_date}::date) + 1
                        ) AS total_leave_days
                      FROM hr.apply_leave al
                      WHERE al.approval = 'approved'
                        AND al.to_date >= ${from_date}::date
                        AND al.from_date <= ${to_date}::date
                      GROUP BY al.employee_uuid
                    ) leave_summary ON e.uuid = leave_summary.employee_uuid
                    
                    -- Off days summary (simplified)
                    LEFT JOIN (
                            WITH params AS
                                  (
                                      SELECT ${from_date}::date AS start_date, ${to_date}::date AS end_date
                                  ),
                              shift_group_periods AS
                              (
                                  SELECT sg.uuid AS shift_group_uuid,
                                      sg.effective_date,
                                      sg.off_days::JSONB AS off_days,
                                      LEAD(sg.effective_date) OVER (PARTITION BY sg.uuid
                                                                  ORDER BY sg.effective_date) AS next_effective_date
                                  FROM hr.shift_group sg
                                  CROSS JOIN params p
                                  WHERE sg.effective_date <= p.end_date
                              ),
                              date_ranges AS
                              (
                                  SELECT shift_group_uuid,
                                      GREATEST(effective_date,
                                              (SELECT start_date
                                                  FROM params)) AS period_start,
                                      LEAST(COALESCE(next_effective_date - INTERVAL '1 day',
                                                      (SELECT end_date
                                                      FROM params)),
                                              (SELECT end_date
                                              FROM params)) AS period_end,
                                      off_days
                                  FROM shift_group_periods
                                  WHERE GREATEST(effective_date,
                                              (SELECT start_date
                                              FROM params)) <= LEAST(COALESCE(next_effective_date - INTERVAL '1 day',
                                                                                  (SELECT end_date
                                                                                  FROM params)),
                                                                          (SELECT end_date
                                                                          FROM params))
                              ),
                              all_offset_days AS
                              (
                                  SELECT dr.shift_group_uuid,
                                      gs::date AS DAY,
                                      od.dname
                                  FROM date_ranges dr
                                  CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS gs
                                  CROSS JOIN LATERAL jsonb_array_elements_text(dr.off_days) AS od(dname)
                              ) 
                              SELECT shift_group_uuid,
                                  COUNT(*) AS total_off_days
                              FROM all_offset_days
                              WHERE lower(to_char(DAY, 'Dy')) = lower(dname)
                              GROUP BY shift_group_uuid
                    ) off_summary ON e.shift_group_uuid = off_summary.shift_group_uuid
                    
                    -- Late applications
                    LEFT JOIN (
                              SELECT
                                me.employee_uuid,
                                COUNT(*) AS total_late_approved
                              FROM hr.manual_entry me
                              WHERE me.approval = 'approved' 
                                AND me.type = 'late_application'
                                AND me.entry_time >= ${from_date}::date 
                                AND me.entry_time <= ${to_date}::date
                              GROUP BY me.employee_uuid
                            ) late_app_summary ON e.uuid = late_app_summary.employee_uuid
                    
                    -- Field visits
                    LEFT JOIN (
                            SELECT
                              me.employee_uuid,
                              COUNT(*) AS total_field_visits_days
                            FROM hr.manual_entry me
                            WHERE me.approval = 'approved' 
                              AND me.type = 'field_visit'
                              AND me.entry_time >= ${from_date}::date 
                              AND me.entry_time <= ${to_date}::date
                            GROUP BY me.employee_uuid
                          ) field_visit_summary ON e.uuid = field_visit_summary.employee_uuid
                    
                    -- Late hours calculation
                  LEFT JOIN (
                            SELECT 
                              t.employee_uuid,
                              SUM(
                                CASE 
                                  WHEN gh.date IS NULL 
                                    AND sp.is_special IS NULL 
                                    AND sod.is_offday IS DISTINCT FROM TRUE 
                                    AND t.first_punch IS NOT NULL 
                                    AND t.first_punch::time > t.late_time::time 
                                  THEN (EXTRACT(EPOCH FROM (t.first_punch::time - t.late_time::time)) / 3600)::float8
                                  ELSE 0
                                END
                              ) AS total_late_hours,
                              SUM(
                                CASE 
                                  WHEN gh.date IS NULL 
                                    AND sp.is_special IS NULL 
                                    AND sod.is_offday IS DISTINCT FROM TRUE 
                                    AND t.last_punch IS NOT NULL 
                                    AND t.last_punch::time > t.early_exit_before::time
                                  THEN (EXTRACT(EPOCH FROM (t.last_punch::time - t.early_exit_before::time)) / 3600)::float8
                                  ELSE 0
                                END
                              ) AS total_early_exit_hours,
                               SUM(
                                  CASE 
                                    WHEN gh.date IS NULL 
                                      AND sp.is_special IS NULL 
                                      AND sod.is_offday IS DISTINCT FROM TRUE 
                                      AND t.first_punch IS NOT NULL 
                                      AND t.last_punch IS NOT NULL
                                    THEN (EXTRACT(EPOCH FROM (t.last_punch - t.first_punch)) / 3600)::float8
                                    ELSE 0
                                  END
                                ) AS total_working_hours
                            FROM (
                              SELECT 
                                pl.employee_uuid,
                                MIN(pl.punch_time) AS first_punch,
                                MAX(pl.punch_time) AS last_punch,
                                s.late_time,
                                s.early_exit_before,
                                e.shift_group_uuid,
                                DATE(pl.punch_time) AS punch_date
                              FROM hr.punch_log pl
                              LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                              LEFT JOIN hr.shift_group sg ON e.shift_group_uuid = sg.uuid
                              LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
                              WHERE pl.punch_time IS NOT NULL 
                                AND pl.punch_time >= ${from_date}::date 
                                AND pl.punch_time <= ${to_date}::date
                              GROUP BY pl.employee_uuid, DATE(pl.punch_time), s.late_time, s.early_exit_before, e.shift_group_uuid
                            ) t
                            LEFT JOIN hr.general_holidays gh ON gh.date = t.punch_date
                            LEFT JOIN LATERAL (
                              SELECT 1 AS is_special
                              FROM hr.special_holidays sh
                              WHERE t.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                              LIMIT 1
                            ) sp ON TRUE
                            LEFT JOIN sg_off_days sod ON sod.shift_group_uuid = t.shift_group_uuid AND sod.day = t.punch_date
                            GROUP BY t.employee_uuid
                          ) late_hours_summary ON e.uuid = late_hours_summary.employee_uuid
                    WHERE ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                  `;

  // Execute the query

  const data = await db.execute(query);

  return c.json(data.rows || [], HSCode.OK);
};

export const getOnLeaveEmployeeAttendanceReport: AppRouteHandler<GetOnLeaveEmployeeAttendanceReportRoute> = async (c: any) => {
  const { employee_uuid, date } = c.req.valid('query');

  const from_date = date ? sql`${date}::date` : sql`CURRENT_DATE::date`;

  const query = sql`
                WITH date_series AS (
                  SELECT generate_series(${from_date}::date, ${from_date}::date, INTERVAL '1 day')::date AS punch_date
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
                          OR hr.is_employee_off_day(e.uuid, ud.punch_date)=true
                          OR hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 0
                        ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                    END AS expected_hours,
                     GREATEST(
                      COALESCE(
                        CASE 
                          WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
                            (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8
                          ELSE 0
                        END
                      , 0)
                      -
                      COALESCE(
                        CASE
                          WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date))
                            OR (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date))
                            OR hr.is_employee_off_day(e.uuid, ud.punch_date)=true
                            OR hr.is_employee_on_leave(e.uuid, ud.punch_date)=true THEN 0
                          ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                        END
                      , 0)
                    , 0)::float8 AS overtime_hours,
                    CASE
                        WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(ud.punch_date))
                          OR (SELECT is_special_holiday FROM hr.is_special_holiday(ud.punch_date)) THEN 'Holiday'
                        WHEN hr.is_employee_off_day(e.uuid, ud.punch_date)=true THEN 'Off Day'
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
                    w.name AS workplace_name,
                    al.reason AS leave_reason,
                    al.from_date AS leave_from,
                    al.to_date AS leave_to,
                    lineManager.name AS line_manager_name
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                  LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                  LEFT JOIN LATERAL (
                                    SELECT
                                        r.shifts_uuid AS shifts_uuid,
                                        r.shift_group_uuid AS shift_group_uuid
                                    FROM hr.roster r
                                    WHERE r.shift_group_uuid = (SELECT el.type_uuid FROM hr.employee_log el WHERE el.type = 'shift_group' AND el.employee_uuid=e.uuid AND el.effective_date <=  ud.punch_date ORDER BY el.effective_date DESC LIMIT 1)
                                      AND r.effective_date <= ud.punch_date
                                    ORDER BY r.effective_date DESC
                                    LIMIT 1
                                  ) AS sg_sel ON TRUE
                  LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                  LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                  LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
                  LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                  LEFT JOIN hr.users lineManager ON e.line_manager_uuid = lineManager.uuid
                  LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                  LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
                  LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid
                    AND ud.punch_date BETWEEN al.from_date::date AND al.to_date::date
                    AND al.approval = 'approved'
                  WHERE 
                    ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before,al.reason, dept.department, des.designation, et.name, e.uuid, w.name, al.from_date, al.to_date, lineManager.name, e.profile_picture
                )
                SELECT
                    uuid,
                    profile_picture,
                    user_uuid,
                    employee_name,
                    shift_name,
                    department_name,
                    designation_name,
                    employment_type_name,
                    workplace_name,
                    start_time,
                    end_time,
                    punch_date,
                    entry_time,
                    exit_time,
                    hours_worked,
                    expected_hours,
                    status,
                    late_time,
                    early_exit_before,
                    late_start_time,
                    late_hours,
                    early_exit_time,
                    early_exit_hours,
                    overtime_hours,
                    leave_reason,
                    leave_from,
                    leave_to,
                    line_manager_name
                FROM attendance_data
                WHERE status = 'Leave'
                ORDER BY employee_name, punch_date;
              `;

  const employeeAttendanceReportPromise = db.execute(query);

  const data = await employeeAttendanceReportPromise;

  return c.json(data.rows || [], HSCode.OK);
};
