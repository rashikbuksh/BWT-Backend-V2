import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { getHolidayCountsDateRange } from '@/lib/variables';
import { createApi } from '@/utils/api';

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
                sg_off_days AS (
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
                        WHEN gh.date IS NOT NULL
                          OR sp.is_special = 1
                          OR sod.is_offday
                          OR al.reason IS NOT NULL THEN 0
                        ELSE (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600)::float8
                    END AS expected_hours,
                    CASE
                        WHEN gh.date IS NOT NULL OR sp.is_special = 1 THEN 'Holiday'
                        WHEN sod.is_offday THEN 'Off Day'
                        WHEN al.reason IS NOT NULL THEN 'Leave'
                        WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                        WHEN MIN(pl.punch_time)::time > s.late_time::time THEN 'Late'
                        WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                        ELSE 'Present'
                    END as status,
                    dept.department AS department_name,
                    des.designation AS designation_name,
                    et.name AS employment_type_name
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                  LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                  LEFT JOIN LATERAL (
                            SELECT
                              COALESCE(
                                (SELECT sg2.shifts_uuid FROM hr.shift_group sg2 WHERE sg2.uuid = e.shift_group_uuid AND sg2.effective_date <= ud.punch_date ORDER BY sg2.effective_date DESC LIMIT 1),
                                (SELECT r.shifts_uuid FROM hr.roster r WHERE r.shift_group_uuid = e.shift_group_uuid AND r.effective_date <= ud.punch_date ORDER BY r.effective_date DESC LIMIT 1)
                              ) AS shifts_uuid
                          ) AS sg_sel ON TRUE
                  LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                  LEFT JOIN hr.general_holidays gh ON gh.date = ud.punch_date
                  LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                  LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
                  LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                  LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                  LEFT JOIN LATERAL (
                    SELECT 1 AS is_special
                    FROM hr.special_holidays sh
                    WHERE ud.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                    LIMIT 1
                  ) AS sp ON TRUE
                  LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid
                    AND ud.punch_date BETWEEN al.from_date::date AND al.to_date::date
                    AND al.approval = 'approved'
                  LEFT JOIN sg_off_days sod ON sod.shift_group_uuid = e.shift_group_uuid
                    AND sod.day = ud.punch_date
                  WHERE 
                    ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, sp.is_special, sod.is_offday, gh.date, al.reason,e.shift_group_uuid, dept.department, des.designation, et.name, e.uuid
                )
                SELECT
                    uuid,
                    user_uuid,
                    employee_name,
                    shift_name,
                    department_name,
                    designation_name,
                    employment_type_name,
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
                        'early_exit_hours', early_exit_hours,
                        'shift_name', shift_name,
                        'start_time', start_time,
                        'end_time', end_time
                        ) ORDER BY punch_date
                    ) AS attendance_records
                FROM attendance_data
                GROUP BY user_uuid, employee_name, shift_name, start_time, end_time, department_name, designation_name, employment_type_name, uuid
                ORDER BY employee_name;
              `;

  const employeeAttendanceReportPromise = db.execute(query);

  const data = await employeeAttendanceReportPromise;

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const monthlyReportByEmployee = await fetchData(
    `/v1/report/monthly-attendance-report?employee_uuid=${employee_uuid}&from_date=${from_date}&to_date=${to_date}`,
  );

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
            late_start_time: record.late_start_time,
            late_hours: record.late_hours,
            early_exit_time: record.early_exit_time,
            early_exit_hours: record.early_exit_hours,
          };
        }
      });
    }

    const monthly_data = Array.isArray(row.attendance_records)
      ? row.attendance_records.map((record: any) => ({
          uuid: row.uuid,
          punch_date: record.punch_date,
          entry_time: record.entry_time,
          exit_time: record.exit_time,
          hours_worked: record.hours_worked,
          expected_hours: record.expected_hours,
          status: record.status,
          late_time: record.late_time,
          early_exit_before: record.early_exit_before,
          late_start_time: record.late_start_time,
          late_hours: record.late_hours,
          early_exit_time: record.early_exit_time,
          early_exit_hours: record.early_exit_hours,
          shift_name: record.shift_name,
          start_time: record.start_time,
          end_time: record.end_time,
        }))
      : [];

    return {
      uuid: row.uuid,
      user_uuid: row.user_uuid,
      employee_name: row.employee_name,
      department_name: row.department_name,
      designation_name: row.designation_name,
      employment_type: row.employment_type_name,
      shift_details: row.shift_details,
      monthly_details: monthlyReportByEmployee[0],
      monthly_data,
      ...attendanceByDate,
    };
  });

  return c.json(formattedData || [], HSCode.OK);
};
// not completed

// Helper function to get holiday counts
// async function getHolidayCounts(from_date: string, to_date: string) {
//   const specialHolidaysQuery = sql`
//     SELECT COALESCE(SUM(
//       CASE
//         WHEN sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date
//         THEN LEAST(sh.to_date::date, ${to_date}::date) - GREATEST(sh.from_date::date, ${from_date}::date) + 1
//         ELSE 0
//       END
//     ), 0) AS total_special_holidays
//     FROM hr.special_holidays sh
//     WHERE sh.from_date::date <= ${to_date}::date AND sh.to_date::date >= ${from_date}::date`;

//   const generalHolidayQuery = sql`
//     SELECT COALESCE(COUNT(*), 0) AS total_general_holidays
//     FROM hr.general_holidays gh
//     WHERE gh.date >= ${from_date}::date AND gh.date <= ${to_date}::date`;

//   const [specialResult, generalResult] = await Promise.all([
//     db.execute(specialHolidaysQuery),
//     db.execute(generalHolidayQuery),
//   ]);

//   return {
//     special: specialResult.rows[0]?.total_special_holidays || 0,
//     general: generalResult.rows[0]?.total_general_holidays || 0,
//   };
// }

export const getDepartmentAttendanceReport: AppRouteHandler<GetDepartmentAttendanceReportRoute> = async (c: any) => {
  const { department_uuid, from_date, to_date } = c.req.valid('query');

  const holidays = await getHolidayCountsDateRange(from_date, to_date);

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
                            u.name AS employee_name,
                            e.shift_group_uuid
                        FROM hr.employee e
                        JOIN hr.users u ON e.user_uuid = u.uuid
                        WHERE ${department_uuid ? sql`u.department_uuid = ${department_uuid}` : sql`TRUE`}
                    ), 
                    -- 3) summary per employee
                    summary_data AS (
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
                            d.uuid AS designation_uuid,
                            d.designation AS designation_name,
                            dep.uuid AS department_uuid,
                            dep.department AS department_name,
                            w.uuid AS workplace_uuid,
                            w.name AS workplace_name,
                            et.uuid AS employment_type_uuid,
                            et.name AS employment_type_name,
                            COALESCE(attendance_summary.present_days, 0)::float8 + COALESCE(attendance_summary.late_days, 0)::float8 AS present_days,
                            COALESCE((${to_date}::date - ${from_date}::date + 1), 0) - (
                                COALESCE(attendance_summary.present_days, 0) + 
                                COALESCE(attendance_summary.late_days, 0) + 
                                COALESCE(leave_summary.total_leave_days, 0) + 
                                COALESCE(${holidays.general}::int, 0) + 
                                COALESCE(${holidays.special}::int, 0) + 
                                COALESCE(off_days_summary.total_off_days, 0)
                            )::float8 AS absent_days,
                            COALESCE(leave_summary.total_leave_days, 0)::float8 AS leave_days,
                            COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
                            COALESCE(attendance_summary.early_exit_days, 0)::float8 AS early_leaves,
                            COALESCE(off_days_summary.total_off_days, 0)::float8 AS off_days
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
                                    e.shift_group_uuid
                                FROM hr.punch_log pl
                                LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
                                LEFT JOIN hr.shift_group ON e.shift_group_uuid = shift_group.uuid
                                LEFT JOIN hr.shifts ON shift_group.shifts_uuid = shifts.uuid
                                WHERE pl.punch_time IS NOT NULL
                                    AND DATE(pl.punch_time) >= ${from_date}::date
                                    AND DATE(pl.punch_time) <= ${to_date}::date
                                GROUP BY pl.employee_uuid, DATE(pl.punch_time), shifts.late_time, shifts.early_exit_before, e.shift_group_uuid
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
                            GROUP BY employee_uuid
                        ) AS attendance_summary ON e.uuid = attendance_summary.employee_uuid
                        LEFT JOIN (
                            SELECT al.employee_uuid,
                                SUM(al.to_date::date - al.from_date::date + 1) - 
                                SUM(
                                    CASE WHEN al.to_date::date > ${to_date}::date THEN al.to_date::date - ${to_date}::date ELSE 0 END + 
                                    CASE WHEN al.from_date::date < ${from_date}::date THEN ${from_date}::date - al.from_date::date ELSE 0 END
                                ) AS total_leave_days
                            FROM hr.apply_leave al
                            WHERE al.approval = 'approved'
                                AND al.to_date >= ${from_date}::date
                                AND al.from_date <= ${to_date}::date
                            GROUP BY al.employee_uuid
                        ) AS leave_summary ON e.uuid = leave_summary.employee_uuid
                        LEFT JOIN (
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
                            all_offset_days AS (
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
                        WHERE ${department_uuid ? sql`u.department_uuid = ${department_uuid}` : sql`TRUE`}
                    ), 
                    -- 3a) expand each shift_group’s configured off_days into concrete dates
                    sg_off_days AS (
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
                                gs::date AS DAY,
                                dr.off_days
                            FROM date_ranges dr
                            CROSS JOIN LATERAL generate_series(dr.period_start, dr.period_end, INTERVAL '1 day') AS gs
                        ),
                        expanded AS (
                            SELECT shift_group_uuid,
                                DAY,
                                TRUE AS is_offday
                            FROM all_days
                            CROSS JOIN LATERAL jsonb_array_elements_text(off_days) AS od(dname)
                            WHERE lower(to_char(DAY, 'Dy')) = lower(od.dname)
                        )
                        SELECT * FROM expanded
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
                                    EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600
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
                                WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR sod.is_offday OR al.reason IS NOT NULL THEN 0
                                ELSE (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600)::float8
                            END AS expected_hours,
                            CASE
                                WHEN gh.date IS NOT NULL OR sp.is_special = 1 THEN 'Holiday'
                                WHEN sod.is_offday THEN 'Off Day'
                                WHEN al.reason IS NOT NULL THEN 'Leave'
                                WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                                WHEN MIN(pl.punch_time)::time > s.late_time::time THEN 'Late'
                                WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                                ELSE 'Present'
                            END AS status,
                            al.reason AS leave_reason
                        FROM dept_employees de
                        CROSS JOIN date_series ds
                        LEFT JOIN hr.punch_log pl ON pl.employee_uuid = de.employee_uuid AND DATE(pl.punch_time) = ds.punch_date
                        LEFT JOIN hr.shift_group sg ON de.shift_group_uuid = sg.uuid
                        LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
                        LEFT JOIN hr.general_holidays gh ON gh.date = ds.punch_date
                        LEFT JOIN LATERAL (
                            SELECT 1 AS is_special
                            FROM hr.special_holidays sh
                            WHERE ds.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                            LIMIT 1
                        ) AS sp ON TRUE
                        LEFT JOIN hr.apply_leave al ON al.employee_uuid = de.employee_uuid
                            AND ds.punch_date BETWEEN al.from_date::date AND al.to_date::date
                            AND al.approval = 'approved'
                        LEFT JOIN sg_off_days sod ON sod.shift_group_uuid = de.shift_group_uuid AND sod.day = ds.punch_date
                        GROUP BY de.employee_uuid, de.user_uuid, de.employee_name, ds.punch_date, s.start_time, s.end_time, gh.date, sp.is_special, sod.is_offday, al.employee_uuid, al.reason, s.late_time, s.early_exit_before
                    )
                    -- 5) final SELECT
                    SELECT 
                        sd.*, 
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
                        sd.off_days
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
          if (record.expected_hours !== 0) {
            hours_worked_sum += record.hours_worked || 0;
            expected_hours_sum += record.expected_hours || 0;
            hours_worked_count += 1;
          }
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
                            ${holidays.general} + ${holidays.special})) * 8)::float8 AS expected_hours
                        
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
