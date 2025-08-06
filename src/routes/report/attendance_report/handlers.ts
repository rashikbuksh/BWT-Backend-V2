import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { GetDepartmentAttendanceReportRoute, GetEmployeeAttendanceReportRoute, GetMonthlyAttendanceReportRoute } from './routes';

export const getEmployeeAttendanceReport: AppRouteHandler<GetEmployeeAttendanceReportRoute> = async (c: any) => {
  const { from_date, to_date, employee_uuid } = c.req.valid('query');

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
                    s.name AS shift_name,
                    s.start_time,
                    s.end_time,
                    s.late_time,
                    s.early_exit_before,
                    DATE(ud.punch_date) AS punch_date,
                    MIN(pl.punch_time) AS entry_time,
                    MAX(pl.punch_time) AS exit_time,
                    (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8 AS hours_worked,
                    (EXTRACT(EPOCH FROM MAX(s.end_time) - MIN(s.start_time)) / 3600)::float8 AS expected_hours,
                    CASE
                      WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                      WHEN MIN(pl.punch_time) > s.late_time THEN 'Late'
                      WHEN MAX(pl.punch_time) < s.early_exit_before THEN 'Early Exit'
                      ELSE 'Present'
                    END as status
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
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
                        'early_exit_before', early_exit_before
                        ) ORDER BY punch_date
                    ) AS attendance_records
                FROM attendance_data
                GROUP BY user_uuid, employee_name, shift_name, start_time, end_time
                ORDER BY employee_name;
              `;

  const employeeAttendanceReportPromise = db.execute(query);

  const data = await employeeAttendanceReportPromise;

  // Format the data to structure attendance records with dates as keys
  const formattedData = data.rows.map((row: any) => {
    const attendanceByDate: any = {};

    // Convert attendance_records array to object with dates as keys
    if (row.attendance_records && Array.isArray(row.attendance_records)) {
      row.attendance_records.forEach((record: any) => {
        if (record.punch_date) {
          attendanceByDate[record.punch_date] = {
            punch_date: record.punch_date,
            entry_time: record.entry_time,
            exit_time: record.exit_time,
            hours_worked: record.hours_worked,
            expected_hours: record.expected_hours,
            status: record.status,
            late_time: record.late_time,
            early_exit_before: record.early_exit_before,
          };
        }
      });
    }

    return {
      user_uuid: row.user_uuid,
      employee_name: row.employee_name,
      shift_details: row.shift_details,
      ...attendanceByDate,
    };
  });

  return c.json(formattedData || [], HSCode.OK);
};
// not completed

export const getDepartmentAttendanceReport: AppRouteHandler<GetDepartmentAttendanceReportRoute> = async (c: any) => {
  const { department_uuid } = c.req.valid('query');

  const { from_date, to_date } = c.req.valid('query');

  const SpecialHolidaysQuery = sql`
                                    SELECT
                                        SUM(
                                            CASE 
                                                WHEN sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date
                                                THEN 
                                                    LEAST(sh.to_date::date, ${to_date}::date) - GREATEST(sh.from_date::date, ${from_date}::date) + 1
                                                ELSE 0
                                            END
                                        ) AS total_special_holidays
                                    FROM hr.special_holidays sh
                                    WHERE sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date`;

  const generalHolidayQuery = sql`
                      SELECT
                          COUNT(*) AS total_off_days
                      FROM 
                          hr.general_holidays gh
                      WHERE
                          gh.date >= ${from_date}::date AND gh.date < ${to_date}::date`;

  const specialHolidaysPromise = db.execute(SpecialHolidaysQuery);
  const generalHolidaysPromise = db.execute(generalHolidayQuery);

  const [specialHolidaysResult, generalHolidaysResult] = await Promise.all([
    specialHolidaysPromise,
    generalHolidaysPromise,
  ]);

  const total_special_holidays
          = specialHolidaysResult.rows[0]?.total_special_holidays || 0;
  const total_general_holidays
          = generalHolidaysResult.rows[0]?.total_off_days || 0;

  const query = sql`
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
                    COALESCE((${to_date}::date - ${from_date}::date+ 1), 0) - (COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) + COALESCE(${total_general_holidays}::int, 0) + COALESCE(${total_special_holidays}::int, 0))::float8 AS absent_days,
                    COALESCE(leave_summary.total_leave_days, 0)::float8 AS leave_days,
                    COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
                    COALESCE(attendance_summary.early_leaves, 0)::float8 AS early_leaves
                FROM hr.employee e
                LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                LEFT JOIN hr.designation d ON e.designation_uuid = d.uuid
                LEFT JOIN hr.department dep ON e.department_uuid = dep.uuid
                LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
                LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                LEFT JOIN (
                SELECT 
                      pl.employee_uuid,
                      COUNT(CASE WHEN pl.punch_time IS NOT NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') < TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS present_days,
                      COUNT(CASE WHEN pl.punch_time IS NOT NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') >= TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS late_days,
                      COUNT(CASE WHEN pl.punch_time IS NOT NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') < TO_CHAR(shifts.early_exit_before, 'HH24:MI') THEN 1 END) AS early_leaves
                FROM hr.punch_log pl
                LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                LEFT JOIN hr.shift_group ON e.shift_group_uuid = shift_group.uuid
                LEFT JOIN hr.shifts ON shift_group.shifts_uuid = shifts.uuid
                WHERE pl.punch_time IS NOT NULL AND pl.punch_time >= ${from_date}::date AND pl.punch_time <= ${to_date}::date
                GROUP BY pl.employee_uuid
                ) AS attendance_summary ON e.uuid = attendance_summary.employee_uuid
                LEFT JOIN (
                      SELECT
                            al.employee_uuid,
                            SUM(al.to_date::date - al.from_date::date + 1) -
                            SUM(
                                          CASE
                                              WHEN al.to_date::date > ${to_date}::date
                                                  THEN al.to_date::date - ${to_date}::date
                                              ELSE 0
                                          END
                                          +
                                          CASE
                                              WHEN al.from_date::date < ${from_date}::date
                                                  THEN ${from_date}::date - al.from_date::date
                                              ELSE 0
                                          END
                                      ) AS total_leave_days
                                  FROM hr.apply_leave al
                                  WHERE al.approval = 'approved'
                                  AND 
                                      al.to_date >= ${from_date}::date
                                      AND al.from_date <= ${to_date}::date
                                  GROUP BY al.employee_uuid
                      ) AS leave_summary ON e.uuid = leave_summary.employee_uuid
                 LEFT JOIN (
                         WITH params AS (
                                SELECT 
                                    ${from_date}::date AS start_date,
                                    ${to_date}::date AS end_date
                            ),
                            shift_group_periods AS (
                                SELECT
                                    sg.uuid as shift_group_uuid,
                                    sg.effective_date,
                                    sg.off_days::jsonb,
                                    LEAD(sg.effective_date) OVER (PARTITION BY sg.uuid ORDER BY sg.effective_date) AS next_effective_date
                                FROM hr.shift_group sg, params p
                                WHERE sg.effective_date <= p.end_date
                            ),
                            date_ranges AS (
                                SELECT
                                    shift_group_uuid,
                                    GREATEST(effective_date, (SELECT start_date FROM params)) AS period_start,
                                    LEAST(
                                        COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)),
                                        (SELECT end_date FROM params)
                                    ) AS period_end,
                                    off_days
                                FROM shift_group_periods
                                WHERE GREATEST(effective_date, (SELECT start_date FROM params)) <= 
                                    LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params))
                            ),
                            all_days AS (
                                SELECT
                                    dr.shift_group_uuid,
                                    d::date AS day,
                                    dr.off_days
                                FROM date_ranges dr
                                CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS d
                            )
                            SELECT
                                shift_group_uuid,
                                COUNT(*) AS total_off_days
                            FROM all_days
                            WHERE lower(to_char(day, 'Dy')) = ANY (
                                SELECT jsonb_array_elements_text(off_days)
                            )
                            GROUP BY shift_group_uuid
            ) AS off_days_summary ON e.shift_group_uuid = off_days_summary.shift_group_uuid
                WHERE e.department_uuid = ${department_uuid}
              `;

  const departmentAttendanceReportPromise = db.execute(query);

  const data = await departmentAttendanceReportPromise;

  return c.json(data.rows || [], HSCode.OK);
};

export const getMonthlyAttendanceReport: AppRouteHandler<GetMonthlyAttendanceReportRoute> = async (c: any) => {
  const { from_date, to_date } = c.req.valid('query');

  const SpecialHolidaysQuery = sql`
                                    SELECT
                                        SUM(
                                            CASE 
                                                WHEN sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date
                                                THEN 
                                                    LEAST(sh.to_date::date, ${to_date}::date) - GREATEST(sh.from_date::date, ${from_date}::date) + 1
                                                ELSE 0
                                            END
                                        ) AS total_special_holidays
                                    FROM hr.special_holidays sh
                                    WHERE sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date`;

  const generalHolidayQuery = sql`
                      SELECT
                          COUNT(*) AS total_off_days
                      FROM 
                          hr.general_holidays gh
                      WHERE
                          gh.date >= ${from_date}::date AND gh.date < ${to_date}::date`;

  const specialHolidaysPromise = db.execute(SpecialHolidaysQuery);
  const generalHolidaysPromise = db.execute(generalHolidayQuery);

  const [specialHolidaysResult, generalHolidaysResult] = await Promise.all([
    specialHolidaysPromise,
    generalHolidaysPromise,
  ]);

  const total_special_holidays
          = specialHolidaysResult.rows[0]?.total_special_holidays || 0;
  const total_general_holidays
          = generalHolidaysResult.rows[0]?.total_off_days || 0;

  //   console.log('total_special_holidays', total_special_holidays);
  //   console.log('total_general_holidays', total_general_holidays);

  // Calculate total days in the date range
  // const totalDays = Math.ceil((new Date(to_date).getTime() - new Date(from_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // // Calculate weekend days (including Friday, Saturday, Sunday)
  // let weekendDays = 0;
  // for (let d = new Date(from_date); d <= new Date(to_date); d.setDate(d.getDate() + 1)) {
  //   const dayOfWeek = d.getDay();
  //   if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) { // Sunday = 0, Friday = 5, Saturday = 6
  //     weekendDays++;
  //   }
  // }

  // const totalHolidays = Number(total_special_holidays) + Number(total_general_holidays);
  // const workingDays = totalDays - weekendDays - totalHolidays;

  const query = sql`
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
      (${to_date}::date - ${from_date}::date + 1)::float8 AS total_days,
      ((${to_date}::date - ${from_date}::date + 1) - (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_days_summary.total_off_days, 0) + COALESCE(${total_general_holidays}::int, 0) + COALESCE(${total_special_holidays}::int, 0)))::float8 AS working_days,
      COALESCE(attendance_summary.present_days, 0)::float8 AS present_days,
      COALESCE((${to_date}::date - ${from_date}::date+ 1), 0) - (COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) + COALESCE(${total_general_holidays}::int, 0) + COALESCE(${total_special_holidays}::int, 0))::float8 AS absent_days,
      COALESCE(leave_summary.total_leave_days, 0)::float8 AS leave_days,
      COALESCE(off_days_summary.total_off_days, 0)::float8 AS off_days,
      COALESCE(${total_general_holidays}, 0)::float8 AS general_holidays,
      COALESCE(${total_special_holidays}, 0)::float8 AS special_holidays,
      COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
      COALESCE(late_application_summary.total_late_approved, 0)::float8 AS approved_lates,
      COALESCE(field_visit_summary.total_field_visits_days, 0)::float8 AS field_visit_days,
      (((${to_date}::date - ${from_date}::date + 1) - (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_days_summary.total_off_days, 0) + COALESCE(${total_general_holidays}::int, 0) + COALESCE(${total_special_holidays}::int, 0))) * 8)::float8 AS expected_hours,
      COALESCE(late_hours_summary.total_late_hours, 0)::float8 AS total_late_hours,
      ((COALESCE(attendance_summary.present_days, 0) * 8) - COALESCE(late_hours_summary.total_late_hours, 0))::float8 AS working_hours,
      ((((${to_date}::date - ${from_date}::date + 1) - (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_days_summary.total_off_days, 0) + COALESCE(${total_general_holidays}::int, 0) + COALESCE(${total_special_holidays}::int, 0))) * 8) - ((COALESCE(attendance_summary.present_days, 0) * 8) - COALESCE(late_hours_summary.total_late_hours, 0)))::float8 AS difference_hours
    FROM hr.employee e
    LEFT JOIN hr.users u ON e.user_uuid = u.uuid
    LEFT JOIN hr.designation d ON e.designation_uuid = d.uuid
    LEFT JOIN hr.department dep ON e.department_uuid = dep.uuid
    LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
    LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
    LEFT JOIN (
                SELECT 
                      pl.employee_uuid,
                      COUNT(CASE WHEN pl.punch_time IS NOT NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') < TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS present_days,
                      COUNT(CASE WHEN pl.punch_time IS NOT NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') >= TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS late_days
                FROM hr.punch_log pl
                LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                LEFT JOIN hr.shift_group ON e.shift_group_uuid = shift_group.uuid
                LEFT JOIN hr.shifts ON shift_group.shifts_uuid = shifts.uuid
                WHERE pl.punch_time IS NOT NULL AND pl.punch_time >= ${from_date}::date AND pl.punch_time <= ${to_date}::date
                GROUP BY pl.employee_uuid
    ) AS attendance_summary ON e.uuid = attendance_summary.employee_uuid
     LEFT JOIN (
                SELECT
                      al.employee_uuid,
                      SUM(al.to_date::date - al.from_date::date + 1) -
                      SUM(
                                    CASE
                                        WHEN al.to_date::date > ${to_date}::date
                                            THEN al.to_date::date - ${to_date}::date
                                        ELSE 0
                                    END
                                    +
                                    CASE
                                        WHEN al.from_date::date < ${from_date}::date
                                            THEN ${from_date}::date - al.from_date::date
                                        ELSE 0
                                    END
                                ) AS total_leave_days
                            FROM hr.apply_leave al
                            WHERE al.approval = 'approved'
                            AND 
                                al.to_date >= ${from_date}::date
                                AND al.from_date <= ${to_date}::date
                            GROUP BY al.employee_uuid
                ) AS leave_summary ON e.uuid = leave_summary.employee_uuid
    LEFT JOIN (
                WITH params AS (
                                SELECT 
                                    ${from_date}::date AS start_date,
                                    ${to_date}::date AS end_date
                            ),
                            shift_group_periods AS (
                                SELECT
                                    sg.uuid as shift_group_uuid,
                                    sg.effective_date,
                                    sg.off_days::jsonb,
                                    LEAD(sg.effective_date) OVER (PARTITION BY sg.uuid ORDER BY sg.effective_date) AS next_effective_date
                                FROM hr.shift_group sg, params p
                                WHERE sg.effective_date <= p.end_date
                            ),
                            date_ranges AS (
                                SELECT
                                    shift_group_uuid,
                                    GREATEST(effective_date, (SELECT start_date FROM params)) AS period_start,
                                    LEAST(
                                        COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)),
                                        (SELECT end_date FROM params)
                                    ) AS period_end,
                                    off_days
                                FROM shift_group_periods
                                WHERE GREATEST(effective_date, (SELECT start_date FROM params)) <= 
                                    LEAST(COALESCE(next_effective_date - INTERVAL '1 day', (SELECT end_date FROM params)), (SELECT end_date FROM params))
                            ),
                            all_days AS (
                                SELECT
                                    dr.shift_group_uuid,
                                    d::date AS day,
                                    dr.off_days
                                FROM date_ranges dr
                                CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS d
                            )
                            SELECT
                                shift_group_uuid,
                                COUNT(*) AS total_off_days
                            FROM all_days
                            WHERE lower(to_char(day, 'Dy')) = ANY (
                                SELECT jsonb_array_elements_text(off_days)
                            )
                            GROUP BY shift_group_uuid
            ) AS off_days_summary ON e.shift_group_uuid = off_days_summary.shift_group_uuid
    LEFT JOIN 
            (
                SELECT
                    me.employee_uuid,
                    COUNT(*) AS total_late_approved
                FROM hr.manual_entry me
                WHERE me.approval = 'approved' AND me.type = 'late_application'
                AND me.entry_time >= ${from_date}::date AND me.entry_time <= ${to_date}::date
                GROUP BY me.employee_uuid
            ) AS late_application_summary ON e.uuid = late_application_summary.employee_uuid
    LEFT JOIN 
            (
                SELECT
                    me.employee_uuid,
                    COUNT(*) AS total_field_visits_days
                FROM hr.manual_entry me
                WHERE me.approval = 'approved' AND me.type = 'field_visit'
                AND me.entry_time >= ${from_date}::date AND me.entry_time <= ${to_date}::date
                GROUP BY me.employee_uuid
            ) AS field_visit_summary ON e.uuid = field_visit_summary.employee_uuid
    LEFT JOIN (
                SELECT 
                    pl.employee_uuid,
                    SUM(
                        CASE 
                            WHEN pl.punch_time IS NOT NULL 
                            AND TO_CHAR(pl.punch_time, 'HH24:MI') > TO_CHAR(shifts.start_time, 'HH24:MI')
                            THEN EXTRACT(EPOCH FROM (
                                pl.punch_time::time - shifts.start_time::time
                            )) / 3600
                            ELSE 0
                        END
                    )::float8 AS total_late_hours
                FROM hr.punch_log pl
                LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                LEFT JOIN hr.shift_group ON e.shift_group_uuid = shift_group.uuid
                LEFT JOIN hr.shifts ON shift_group.shifts_uuid = shifts.uuid
                WHERE pl.punch_time IS NOT NULL AND pl.punch_time >= ${from_date}::date AND pl.punch_time <= ${to_date}::date
                GROUP BY pl.employee_uuid
            ) AS late_hours_summary ON e.uuid = late_hours_summary.employee_uuid
  `;

  const monthlyAttendanceReportPromise = db.execute(query);

  const data = await monthlyAttendanceReportPromise;

  return c.json(data.rows || [], HSCode.OK);
};
