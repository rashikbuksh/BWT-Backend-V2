import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { getHolidayCountsDateRange } from '@/lib/variables';

import type { GetEmployeeWorkingHourReportRoute } from './routes';

export const getEmployeeWorkingHourReport: AppRouteHandler<GetEmployeeWorkingHourReportRoute> = async (c: any) => {
  const { department_uuid, from_date, to_date } = c.req.valid('query');

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
            u.name AS employee_name,
            e.shift_group_uuid
        FROM hr.employee e
        JOIN hr.users u ON e.user_uuid = u.uuid
        WHERE ${department_uuid ? sql` u.department_uuid = ${department_uuid}` : sql` TRUE`}
    ), -- 3) your existing summary per employee
    summary_data AS
    (
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
            COALESCE((${to_date}::date - ${from_date}::date + 1), 0) - (COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) + COALESCE(${holidays.general}::int, 0) + COALESCE(${holidays.special}::int, 0) + COALESCE(off_days_summary.total_off_days, 0))::float8 AS absent_days,
            COALESCE(leave_summary.total_leave_days, 0)::float8 AS leave_days,
            COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
            COALESCE(attendance_summary.early_leaves, 0)::float8 AS early_leaves,
            COALESCE(off_days_summary.total_off_days, 0)::float8 AS off_days
        FROM hr.employee e
        LEFT JOIN hr.users u ON e.user_uuid = u.uuid
        LEFT JOIN hr.designation d ON u.designation_uuid = d.uuid
        LEFT JOIN hr.department dep ON u.department_uuid = dep.uuid
        LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
        LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
        LEFT JOIN
        (
            WITH daily_attendance AS (
                SELECT 
                    pl.employee_uuid,
                    DATE(pl.punch_time) AS attendance_date,
                    MIN(pl.punch_time) AS first_punch,
                    MAX(pl.punch_time) AS last_punch,
                    shifts.late_time,
                    shifts.early_exit_before
                FROM hr.punch_log pl
                LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                LEFT JOIN hr.shift_group ON e.shift_group_uuid = shift_group.uuid
                LEFT JOIN hr.shifts ON shift_group.shifts_uuid = shifts.uuid
                WHERE pl.punch_time IS NOT NULL
                    AND DATE(pl.punch_time) >= ${from_date}::date
                    AND DATE(pl.punch_time) <= ${to_date}::date
                GROUP BY pl.employee_uuid, DATE(pl.punch_time), shifts.late_time, shifts.early_exit_before
            )
            SELECT 
                employee_uuid,
                COUNT(CASE 
                    WHEN TO_CHAR(first_punch, 'HH24:MI') < TO_CHAR(late_time, 'HH24:MI') 
                    THEN 1 
                END) AS present_days,
                COUNT(CASE 
                    WHEN TO_CHAR(first_punch, 'HH24:MI') >= TO_CHAR(late_time, 'HH24:MI') 
                    THEN 1 
                END) AS late_days,
                COUNT(CASE 
                    WHEN TO_CHAR(last_punch, 'HH24:MI') < TO_CHAR(early_exit_before, 'HH24:MI') 
                    THEN 1 
                END) AS early_leaves
            FROM daily_attendance
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
        LEFT JOIN
        (
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
        ) AS off_days_summary ON e.shift_group_uuid = off_days_summary.shift_group_uuid
        WHERE ${department_uuid ? sql` u.department_uuid = ${department_uuid}` : sql` TRUE`}), 
        -- 3a) expand each shift_group’s configured off_days into concrete dates
        sg_off_days AS
        (
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
            all_days AS
            (
                SELECT dr.shift_group_uuid,
                    gs::date AS DAY,
                    dr.off_days
                FROM date_ranges dr
                CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS gs
            ),
            expanded AS
            (
                SELECT shift_group_uuid,
                    DAY,
                    TRUE AS is_offday
                FROM all_days
                CROSS JOIN LATERAL jsonb_array_elements_text(off_days) AS od(dname) -- lower-case both sides so "Fri" = "fri"
                WHERE lower(to_char(DAY, 'Dy')) = lower(od.dname)
            )
        SELECT * FROM expanded
    ), 
    -- 4) detailed date-wise per employee
    attendance_data AS
        (
            SELECT de.employee_uuid,
                de.user_uuid,
                de.employee_name,
                ds.punch_date,
                s.name AS shift_name,
                s.start_time,
                s.end_time,
                MIN(pl.punch_time) AS entry_time,
                MAX(pl.punch_time) AS exit_time,
                CASE
                    WHEN MIN(pl.punch_time) IS NOT NULL
                    AND MAX(pl.punch_time) IS NOT NULL THEN (
                        EXTRACT(
                            EPOCH
                            FROM MAX(pl.punch_time) - MIN(pl.punch_time)
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
                (
                    EXTRACT(
                        EPOCH
                        FROM s.end_time - s.start_time
                    ) / 3600
                )::float8 AS expected_hours,
                CASE
                    WHEN gh.date IS NOT NULL
                        OR sp.is_special = 1
                        OR sod.is_offday THEN 'Off Day'
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
            LEFT JOIN hr.shift_group sg ON de.shift_group_uuid = sg.uuid
            LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
            LEFT JOIN hr.general_holidays gh ON gh.date = ds.punch_date
            LEFT JOIN LATERAL
                (SELECT 1 AS is_special
                FROM hr.special_holidays sh
                WHERE ds.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                LIMIT 1) AS sp ON TRUE
            LEFT JOIN hr.apply_leave al ON al.employee_uuid = de.employee_uuid
            AND ds.punch_date BETWEEN al.from_date::date AND al.to_date::date
            AND al.approval = 'approved'
            LEFT JOIN sg_off_days sod ON sod.shift_group_uuid = de.shift_group_uuid
            AND sod.day = ds.punch_date
            GROUP BY de.employee_uuid,
                de.user_uuid,
                de.employee_name,
                ds.punch_date,
                s.start_time,
                s.end_time,
                gh.date,
                sp.is_special,
                sod.is_offday,
                al.employee_uuid,
                al.reason,
                s.late_time,
                s.early_exit_before,
                s.name,
                s.start_time,
                s.end_time
        ) 
    -- 5) final SELECT …
        SELECT 
            sd.*, 
            JSON_BUILD_OBJECT(
                'name', ad.shift_name,
                'start_time', ad.start_time,
                'end_time', ad.end_time
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
                    'leave_reason', ad.leave_reason
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
            sd.early_leaves,
            sd.off_days,
            ad.shift_name,
            ad.start_time,
            ad.end_time
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
          };
          // Sum up hours worked and expected hours
          hours_worked_sum += record.hours_worked || 0;
          expected_hours_sum += record.expected_hours || 0;
          hours_worked_count += 1;
        }
      });
    }

    return {
      employee_uuid: row.employee_uuid,
      user_uuid: row.user_uuid,
      employee_name: row.employee_name,
      designation_uuid: row.designation_uuid,
      designation_name: row.designation_name,
      department_uuid: row.department_uuid,
      department_name: row.department_name,
      workplace_uuid: row.workplace_uuid,
      workplace_name: row.workplace_name,
      employment_type_uuid: row.employment_type_uuid,
      employment_type_name: row.employment_type_name,
      present_days: row.present_days,
      absent_days: row.absent_days,
      leave_days: row.leave_days,
      late_days: row.late_days,
      early_leaves: row.early_leaves,
      off_days: row.off_days,
      ...attendanceByDate,
      total_hours_worked: hours_worked_sum,
      total_expected_hours: expected_hours_sum,
      total_hour_difference: (expected_hours_sum - hours_worked_sum) || 0,
      average_hours_worked: hours_worked_count > 0 ? (hours_worked_sum / hours_worked_count) : 0,
    };
  });

  return c.json(formattedData || [], HSCode.OK);
};
