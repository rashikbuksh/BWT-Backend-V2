import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { getHolidayCountsDateRange } from '@/lib/variables';

import type { GetEmployeeWorkingHourReportRoute } from './routes';

export const getEmployeeWorkingHourReport: AppRouteHandler<GetEmployeeWorkingHourReportRoute> = async (c: any) => {
  const { department_uuid, from_date, to_date, status } = c.req.valid('query');

  const holidays = await getHolidayCountsDateRange(from_date, to_date);

  const query = sql`
    WITH 
    -- 1) every date in the range
    date_series AS
    (
        SELECT generate_series(${from_date}::date, ${to_date}::date, INTERVAL '1 day')::date AS punch_date
    ), 
    -- 2) only employees in this department
    dept_employees AS
    (
        SELECT 
            e.uuid AS employee_uuid,
            u.uuid AS user_uuid,
            u.name AS employee_name
        FROM hr.employee e
        JOIN hr.users u ON e.user_uuid = u.uuid
        WHERE ${department_uuid !== 'undefined' && department_uuid ? sql` u.department_uuid = ${department_uuid}` : sql` TRUE`}
    ), -- 3) your existing summary per employee
    summary_data AS
    (
        SELECT 
            e.uuid AS employee_uuid,
            u.uuid AS user_uuid,
            u.name AS employee_name,
            e.employee_id as employee_id,
            d.uuid AS designation_uuid,
            d.designation AS designation_name,
            dep.uuid AS department_uuid,
            dep.department AS department_name,
            w.uuid AS workplace_uuid,
            w.name AS workplace_name,
            et.uuid AS employment_type_uuid,
            et.name AS employment_type_name,
            e.profile_picture,
            e.start_date::date,
            COALESCE(attendance_summary.present_days, 0)::float8 + COALESCE(attendance_summary.late_days, 0)::float8 AS present_days,
            COALESCE((${to_date}::date - ${from_date}::date + 1), 0) - (COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) + COALESCE(${holidays.general}::int, 0) + COALESCE(${holidays.special}::int, 0) + hr.get_offday_count(e.uuid, ${from_date}::date, ${to_date}::date))::float8 AS absent_days,
            COALESCE(leave_summary.total_leave_days, 0)::float8 AS leave_days,
            COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
            COALESCE(attendance_summary.early_exit_days, 0)::float8 AS early_exit_days,
            hr.get_offday_count(e.uuid, ${from_date}::date, ${to_date}::date) AS off_days
        FROM hr.employee e
        LEFT JOIN hr.users u ON e.user_uuid = u.uuid
        LEFT JOIN hr.designation d ON u.designation_uuid = d.uuid
        LEFT JOIN hr.department dep ON u.department_uuid = dep.uuid
        LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
        LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
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
                                AND el.type = 'shift_group'
                                AND el.effective_date::date <= DATE(pl.punch_time)
                                ORDER BY el.effective_date DESC
                                LIMIT 1) AS shift_group_uuid
                    FROM hr.punch_log pl
                    LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                    LEFT JOIN LATERAL (
                            SELECT r.shifts_uuid AS shifts_uuid
                            FROM hr.roster r
                            WHERE r.shift_group_uuid = (
                            SELECT el.type_uuid
                            FROM hr.employee_log el
                            WHERE el.employee_uuid = e.uuid
                                AND el.type = 'shift_group'
                                AND el.effective_date::date <= DATE(pl.punch_time)
                            ORDER BY el.effective_date DESC
                            LIMIT 1
                            )
                            AND r.effective_date <= DATE(pl.punch_time)
                            ORDER BY r.effective_date DESC
                            LIMIT 1
                        ) sg_sel ON TRUE
                    LEFT JOIN hr.shifts shifts ON shifts.uuid = sg_sel.shifts_uuid
                    WHERE pl.punch_time IS NOT NULL
                        AND DATE(pl.punch_time) >= ${from_date}::date
                        AND DATE(pl.punch_time) <= ${to_date}::date
                    GROUP BY pl.employee_uuid, DATE(pl.punch_time), shifts.late_time, shifts.early_exit_before, shift_group_uuid
                )
                SELECT 
                    da.employee_uuid,
                    COUNT(
                            CASE
                            WHEN gh.date IS NULL
                                AND sp.is_special IS NULL
                                AND  hr.is_employee_off_day(da.employee_uuid,da.attendance_date)=false
                                AND NOT EXISTS(
                                SELECT 1 FROM hr.apply_leave al2
                                WHERE al2.employee_uuid = da.employee_uuid
                                    AND da.attendance_date BETWEEN al2.from_date::date AND al2.to_date::date
                                    AND al2.approval = 'approved'
                                )
                                AND da.first_punch::time < da.late_time::time
                            THEN 1 ELSE NULL
                            END
                        ) AS present_days,
                    COUNT(
                        CASE 
                            WHEN gh.date IS NULL
                                AND sp.is_special IS NULL 
                                AND  hr.is_employee_off_day(da.employee_uuid,da.attendance_date)=false
                                AND NOT EXISTS( 
                                    SELECT 1 FROM hr.apply_leave al2
                                    WHERE al2.employee_uuid = da.employee_uuid
                                        AND da.attendance_date BETWEEN al2.from_date::date AND al2.to_date::date
                                        AND al2.approval = 'approved'
                                )
                                AND da.first_punch::time >= da.late_time::time THEN 1
                            ELSE NULL
                        END
                    ) AS late_days,
                    COUNT(
                        CASE 
                            WHEN gh.date IS NULL
                                AND sp.is_special IS NULL 
                                AND hr.is_employee_off_day(da.employee_uuid,da.attendance_date)=false
                                AND NOT EXISTS( 
                                    SELECT 1 FROM hr.apply_leave al2
                                    WHERE al2.employee_uuid = da.employee_uuid
                                        AND da.attendance_date BETWEEN al2.from_date::date AND al2.to_date::date
                                        AND al2.approval = 'approved'
                                )
                                AND da.last_punch::time <= da.early_exit_before::time THEN 1
                            ELSE NULL
                        END
                    ) AS early_exit_days
                FROM daily_attendance da
                LEFT JOIN LATERAL (
                                    SELECT 1 AS is_leave
                                    FROM hr.apply_leave al
                                    WHERE al.employee_uuid = da.employee_uuid
                                        AND da.attendance_date BETWEEN al.from_date::date AND al.to_date::date
                                        AND al.approval = 'approved'
                                    LIMIT 1
                                    ) al ON TRUE
                LEFT JOIN hr.general_holidays gh ON gh.date = da.attendance_date
                LEFT JOIN LATERAL (
                    SELECT 1 AS is_special
                    FROM hr.special_holidays sh
                    WHERE da.attendance_date BETWEEN sh.from_date::date AND sh.to_date::date
                    LIMIT 1
                ) sp ON TRUE
                GROUP BY employee_uuid
            ) AS attendance_summary ON e.uuid = attendance_summary.employee_uuid
        LEFT JOIN
            (
                SELECT al.employee_uuid,
                    SUM(al.to_date::date - al.from_date::date + 1) - 
                    SUM(CASE WHEN al.to_date::date > ${to_date}::date THEN al.to_date::date - ${to_date}::date
                            ELSE 0
                        END + CASE WHEN al.from_date::date < ${from_date}::date THEN ${from_date}::date - al.from_date::date
                            ELSE 0
                        END
                    ) AS total_leave_days
                FROM hr.apply_leave al
                WHERE al.approval = 'approved'
                    AND al.to_date >= ${from_date}::date
                    AND al.from_date <= ${to_date}::date
                GROUP BY al.employee_uuid
            ) AS leave_summary ON e.uuid = leave_summary.employee_uuid
        WHERE 
            ${department_uuid !== 'undefined' && department_uuid ? sql` u.department_uuid = ${department_uuid}` : sql` TRUE`}
            AND ${status === 'active'
              ? sql`e.is_resign = false AND e.status = true`
              : status === 'inactive'
                ? sql`e.is_resign = false AND e.status = false`
                : status === 'resigned'
                  ? sql`e.is_resign = true`
                  : sql`e.status = true`}
            ), 
    attendance_data AS
        (
            SELECT de.employee_uuid,
                de.user_uuid,
                de.employee_name,
                ds.punch_date,
                s.name AS shift_name,
                s.start_time,
                s.end_time,
                sg.name AS shift_group_name,
                MIN(pl.punch_time) AS entry_time,
                MAX(pl.punch_time) AS exit_time,
                CASE
                    WHEN MIN(pl.punch_time) IS NOT NULL
                    AND MAX(pl.punch_time) IS NOT NULL THEN (
                        EXTRACT(
                            EPOCH
                            FROM MAX(pl.punch_time)::time - MIN(pl.punch_time)::time
                        ) / 3600
                    )::float8
                    ELSE 0
                END AS hours_worked,
                CASE 
                    WHEN MAX(pl.punch_time) IS NOT NULL 
                        AND MAX(pl.punch_time)::time < s.early_exit_before::time 
                            THEN 
                                (EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::float8
                    ELSE 0
                END AS early_exit_hours,
                CASE 
                    WHEN MIN(pl.punch_time) IS NOT NULL 
                        AND MIN(pl.punch_time)::time > s.late_time::time 
                        THEN 
                            (EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::float8
                    ELSE 0
                END AS late_hours,
                CASE
                    WHEN gh.date IS NOT NULL
                        OR sp.is_special = 1
                        OR hr.is_employee_off_day(de.employee_uuid, ds.punch_date)=true
                        OR al.reason IS NOT NULL THEN 0
                    ELSE (
                        EXTRACT(
                            EPOCH
                            FROM s.end_time::time - s.start_time::time
                        ) / 3600
                    )::float8
                END AS expected_hours,
                CASE
                    WHEN gh.date IS NOT NULL
                        OR sp.is_special = 1 THEN 'Holiday'
                    WHEN hr.is_employee_off_day(de.employee_uuid, ds.punch_date)=true THEN 'Off Day'
                    WHEN al.reason IS NOT NULL THEN 'On Leave'
                    WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                    WHEN MIN(pl.punch_time)::time > s.late_time::time THEN 'Late'
                    WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                    ELSE 'Present'
                END AS status,
                al.reason AS leave_reason
            FROM dept_employees de
            CROSS JOIN date_series ds
            LEFT JOIN hr.punch_log pl ON pl.employee_uuid = de.employee_uuid
            AND DATE(pl.punch_time) = ds.punch_date
            LEFT JOIN LATERAL (
                SELECT r.shifts_uuid AS shifts_uuid,
                       r.shift_group_uuid AS shift_group_uuid
                FROM hr.roster r
                WHERE r.shift_group_uuid = (
                    SELECT el.type_uuid
                    FROM hr.employee_log el
                    WHERE el.employee_uuid = de.employee_uuid
                        AND el.type = 'shift_group'
                        AND el.effective_date::date <= ds.punch_date
                    ORDER BY el.effective_date DESC
                    LIMIT 1
                )
                AND r.effective_date <= ds.punch_date
                ORDER BY r.effective_date DESC
                LIMIT 1
            ) sg_sel ON TRUE
            LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
            LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
            LEFT JOIN hr.general_holidays gh ON gh.date = ds.punch_date
            LEFT JOIN LATERAL
                (SELECT 1 AS is_special
                FROM hr.special_holidays sh
                WHERE ds.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                LIMIT 1) AS sp ON TRUE
            LEFT JOIN hr.apply_leave al ON al.employee_uuid = de.employee_uuid
            AND ds.punch_date BETWEEN al.from_date::date AND al.to_date::date
            AND al.approval = 'approved'
            GROUP BY de.employee_uuid,
                de.user_uuid,
                de.employee_name,
                ds.punch_date,
                s.start_time,
                s.end_time,
                gh.date,
                sp.is_special,
                al.employee_uuid,
                al.reason,
                s.late_time,
                s.early_exit_before,
                s.name,
                s.start_time,
                s.end_time,
                sg.name
        ) 
    -- 5) final SELECT …
        SELECT 
            sd.*, 
            JSON_BUILD_OBJECT(
                'name', MAX(ad.shift_name),
                'start_time', MAX(ad.start_time),
                'end_time', MAX(ad.end_time)
            ) AS shift_details,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'punch_date', ad.punch_date, 
                    'entry_time', ad.entry_time, 
                    'exit_time', ad.exit_time, 
                    'hours_worked', ad.hours_worked, 
                    'expected_hours', ad.expected_hours, 
                    'early_exit_hours', ad.early_exit_hours,
                    'late_hours', ad.late_hours,
                    'status', ad.status, 
                    'leave_reason', ad.leave_reason,
                    'shift_group_name', ad.shift_group_name,
                    'shift_name', ad.shift_name,
                    'start_time', ad.start_time,
                    'end_time', ad.end_time
                )
                ORDER BY ad.punch_date
            ) AS attendance_records
        FROM
            summary_data sd
            LEFT JOIN attendance_data ad ON sd.employee_uuid = ad.employee_uuid
        GROUP BY
            sd.employee_uuid,
            sd.user_uuid,
            sd.employee_name,
            sd.employee_id,
            sd.designation_uuid,
            sd.designation_name,
            sd.department_uuid,
            sd.department_name,
            sd.workplace_uuid,
            sd.workplace_name,
            sd.employment_type_uuid,
            sd.employment_type_name,
            sd.present_days,
            sd.absent_days,
            sd.leave_days,
            sd.late_days,
            sd.early_exit_days,
            sd.off_days,
            sd.profile_picture,
            sd.start_date
        `;

  // Execute the simplified query
  const data = await db.execute(query);

  // Format the data to structure attendance records with dates as keys
  const formattedData = data.rows.map((row: any) => {
    const attendanceByDate: any = {};
    let hours_worked_sum = 0;
    let expected_hours_sum = 0;
    let hours_worked_count = 0;
    // Convert attendance_records array to object with dates as keys
    // actual hours worked, expected hours, and other details
    if (row.attendance_records && Array.isArray(row.attendance_records)) {
      row.attendance_records.forEach((record: any) => {
        if (record.punch_date) {
          attendanceByDate[record.punch_date] = {
            punch_date: record.punch_date,
            entry_time: record.entry_time,
            exit_time: record.exit_time,
            hours_worked: record.hours_worked,
            expected_hours: record.expected_hours,
            early_exit_hours: record.early_exit_hours,
            late_hours: record.late_hours,
            status: record.status,
            leave_reason: record.leave_reason,
            shift_group_name: record.shift_group_name,
            shift_name: record.shift_name,
            start_time: record.start_time,
            end_time: record.end_time,
          };
          // Sum up hours worked and expected hours
          hours_worked_sum += record.hours_worked || 0;
          expected_hours_sum += record.expected_hours || 0;
          hours_worked_count += 1;
        }
      });
    }

    return {
      ...row,
      ...attendanceByDate,
      total_hours_worked: hours_worked_sum,
      total_expected_hours: expected_hours_sum,
      total_hour_difference: (expected_hours_sum - hours_worked_sum) || 0,
      average_hours_worked: hours_worked_count > 0 ? (hours_worked_sum / hours_worked_count) : 0,
    };
  });

  return c.json(formattedData || [], HSCode.OK);
};
