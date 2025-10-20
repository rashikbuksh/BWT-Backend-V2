import type { AppRouteHandler } from '@/lib/types';

import { eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { getEmployeeAttendanceForDate, getHolidayCountsDateRange, getOffDayCountsDateRange } from '@/lib/variables';
import { employee } from '@/routes/hr/schema';
import { createApi } from '@/utils/api';

import type { GetDailyEmployeeAttendanceReportRoute, GetDepartmentAttendanceReportRoute, GetEmployeeAttendanceReportRoute, GetMonthlyAttendanceReportRoute } from './routes';

export const getEmployeeAttendanceReport: AppRouteHandler<GetEmployeeAttendanceReportRoute> = async (c: any) => {
  let { from_date, to_date, employee_uuid } = c.req.valid('query');

  if (employee_uuid) {
    const employeeData = await db.select().from(employee).where(eq(employee.uuid, employee_uuid));

    const joiningDate = employeeData[0]?.start_date;
    if (joiningDate) {
      const jd = new Date(joiningDate);
      const localDate = `${jd.getFullYear()}-${String(jd.getMonth() + 1).padStart(2, '0')}-${String(jd.getDate()).padStart(2, '0')}`;
      if (new Date(from_date) < new Date(localDate)) {
        from_date = localDate;
      }
    }
  }

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
                    e.start_date::date,
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
                          OR hr.is_employee_off_day(e.uuid, ud.punch_date)=true
                          OR al.reason IS NOT NULL THEN 0
                        ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                    END AS expected_hours,
                    CASE
                        WHEN gh.date IS NOT NULL OR sp.is_special = 1 THEN 'Holiday'
                        WHEN hr.is_employee_off_day(e.uuid, ud.punch_date)=true THEN 'Off Day'
                        WHEN al.reason IS NOT NULL THEN 'Leave'
                        WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                        WHEN MIN(pl.punch_time)::time > s.late_time::time THEN 'Late'
                        WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                        ELSE 'Present'
                    END as status,
                    dept.department AS department_name,
                    des.designation AS designation_name,
                    et.name AS employment_type_name,
                    shift_group.name AS shift_group_name
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
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
                  WHERE 
                    ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, sp.is_special, gh.date, al.reason, dept.department, des.designation, et.name, e.uuid, shift_group.name, e.start_date
                )
                SELECT
                    uuid,
                    user_uuid,
                    employee_name,
                    department_name,
                    designation_name,
                    employment_type_name,
                    start_date,
                    JSON_AGG(JSON_BUILD_OBJECT(
                        'name', shift_name,
                        'start_time', start_time,
                        'end_time', end_time,
                        'punch_date', punch_date
                    ) ORDER BY punch_date) AS shift_details, 
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
                        'end_time', end_time,
                        'shift_group_name', shift_group_name
                        ) ORDER BY punch_date
                    ) AS attendance_records
                FROM attendance_data
                -- group only by stable identifiers so all dates aggregate into one employee row
                GROUP BY user_uuid, employee_name, department_name, designation_name, employment_type_name, uuid, start_date
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
            shift_name: record.shift_name,
            start_time: record.start_time,
            end_time: record.end_time,
            shift_group_name: record.shift_group_name,
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
          shift_group_name: record.shift_group_name,
        }))
      : [];

    return {
      uuid: row.uuid,
      user_uuid: row.user_uuid,
      employee_name: row.employee_name,
      department_name: row.department_name,
      designation_name: row.designation_name,
      employment_type: row.employment_type_name,
      start_date: row.start_date,
      shift_details: row.shift_details,
      monthly_details: monthlyReportByEmployee[0],
      monthly_data,
      ...attendanceByDate,
    };
  });

  return c.json(formattedData || [], HSCode.OK);
};

export const getDepartmentAttendanceReport: AppRouteHandler<GetDepartmentAttendanceReportRoute> = async (c: any) => {
  const { department_uuid, from_date, to_date } = c.req.valid('query');

  const holidays = await getHolidayCountsDateRange(from_date, to_date);
  // const offDays = await getOffDayCountsDateRange(from_date, to_date);

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
                        LEFT JOIN hr.users u ON e.user_uuid = u.uuid
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
                            e.start_date::date,
                            COALESCE(attendance_summary.present_days, 0)::float8 + COALESCE(attendance_summary.late_days, 0)::float8 AS present_days,
                            COALESCE((${to_date}::date - ${from_date}::date + 1), 0) - (
                                COALESCE(attendance_summary.present_days, 0) + 
                                COALESCE(attendance_summary.late_days, 0) + 
                                COALESCE(leave_summary.total_leave_days, 0) + 
                                COALESCE(${holidays.general}::int, 0) + 
                                COALESCE(${holidays.special}::int, 0) + 
                                hr.get_offday_count(e.uuid, ${from_date}, ${to_date})
                            )::float8 AS absent_days,
                            COALESCE(leave_summary.total_leave_days, 0)::float8 AS leave_days,
                            COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
                            COALESCE(attendance_summary.early_exit_days, 0)::float8 AS early_leaves,
                            hr.get_offday_count(e.uuid, ${from_date}, ${to_date}) AS off_days,
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
                                              SELECT r.shifts_uuid AS shifts_uuid
                                              FROM hr.roster r
                                              WHERE r.shift_group_uuid = (
                                                SELECT el.type_uuid
                                                FROM hr.employee_log el
                                                WHERE el.employee_uuid = e.uuid
                                                  AND el.type = 'shift_group'
                                                  AND el.effective_date::date <= ${to_date}::date
                                                ORDER BY el.effective_date DESC
                                                LIMIT 1
                                              )
                                              AND r.effective_date <= ${to_date}::date
                                              ORDER BY r.effective_date DESC
                                              LIMIT 1
                                            ) sg_sel ON TRUE
                        LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
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
                            shift_group.name AS shift_group_name,
                            s.name AS shift_name,
                            s.start_time,
                            s.end_time,
                            s.late_time,
                            s.early_exit_before,
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
                                WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR  hr.is_employee_off_day(de.employee_uuid,ds.punch_date)=true OR al.reason IS NOT NULL THEN 0
                                ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                            END AS expected_hours,
                            CASE
                                WHEN gh.date IS NOT NULL OR sp.is_special = 1 THEN 'Holiday'
                                WHEN hr.is_employee_off_day(de.employee_uuid,ds.punch_date)=true THEN 'Off Day'
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
                        LEFT JOIN LATERAL (
                            SELECT r.shifts_uuid AS shifts_uuid,
                            r.shift_group_uuid
                            FROM hr.roster r
                            WHERE r.shift_group_uuid = (
                                SELECT el.type_uuid
                                FROM hr.employee_log el
                                WHERE el.employee_uuid = de.employee_uuid
                                AND el.type = 'shift_group'
                                AND el.effective_date::date <= ds.punch_date::date
                                ORDER BY el.effective_date DESC
                                LIMIT 1
                            )
                            AND r.effective_date <= ds.punch_date::date
                            ORDER BY r.effective_date DESC
                            LIMIT 1
                        ) sg_sel ON TRUE
                        LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                        LEFT JOIN hr.shift_group shift_group ON shift_group.uuid = sg_sel.shift_group_uuid
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
                        GROUP BY de.employee_uuid, de.user_uuid, de.employee_name, ds.punch_date, s.start_time, s.end_time, gh.date, sp.is_special,al.employee_uuid, al.reason, s.late_time, s.early_exit_before, shift_group.name, s.name
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
                                'leave_reason', ad.leave_reason,
                                'shift_name', ad.shift_name,
                                'start_time', ad.start_time,
                                'end_time', ad.end_time,
                                'shift_group_name', ad.shift_group_name
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
                        sd.shift_name,
                        sd.shift_start_time,
                        sd.shift_end_time,
                        sd.start_date 
                    `;
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
            shift_name: record.shift_name,
            start_time: record.start_time,
            end_time: record.end_time,
            shift_group_name: record.shift_group_name,

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
      shift_name: row.shift_name,
      start_time: row.shift_start_time,
      end_time: row.shift_end_time,
      start_date: row.start_date,
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

  const query = sql`
                      WITH params AS (
                        SELECT ${from_date}::date AS start_date, ${to_date}::date AS end_date
                      ),
                      dates AS (
                        SELECT generate_series(start_date, end_date, INTERVAL '1 day')::date AS punch_date
                        FROM params
                      ),
                      attendance_data AS (
                        SELECT
                          e.uuid AS employee_uuid,
                          u.uuid AS user_uuid,
                          u.name AS employee_name,
                          s.name AS shift_name,
                          s.start_time,
                          s.end_time,
                          s.late_time,
                          s.early_exit_before,
                          sg.name AS shift_group_name,
                          e.start_date::date,
                          d.punch_date,
                          MIN(pl.punch_time) AS entry_time,
                          MAX(pl.punch_time) AS exit_time,
                          CASE 
                            WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
                              (EXTRACT(EPOCH FROM MAX(pl.punch_time)::time - MIN(pl.punch_time)::time) / 3600)::float8
                            ELSE NULL
                          END AS working_hours,
                          CASE
                            WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR hr.is_employee_off_day(e.uuid, d.punch_date)=true OR al.reason IS NOT NULL THEN 0
                            ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                          END AS expected_working_hours,
                          CASE 
                            WHEN MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time > s.late_time::time THEN
                              (EXTRACT(EPOCH FROM (MIN(pl.punch_time)::time - s.late_time::time)) / 3600)::float8
                            ELSE NULL
                          END AS late_hours,
                          CASE 
                            WHEN MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN
                              (EXTRACT(EPOCH FROM (s.early_exit_before::time - MAX(pl.punch_time)::time)) / 3600)::float8
                            ELSE NULL
                          END AS early_exit_hours,
                          GREATEST(
                            COALESCE(
                              CASE 
                                WHEN MIN(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time) IS NOT NULL THEN
                                  (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8
                                ELSE 0
                              END, 0
                            ) - COALESCE(
                              CASE
                                WHEN gh.date IS NOT NULL OR sp.is_special = 1 OR hr.is_employee_off_day(e.uuid, d.punch_date)=true OR al.reason IS NOT NULL THEN 0
                                ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                              END, 0
                            ), 0
                          )::float8 AS overtime_hours,
                          CASE WHEN gh.date IS NOT NULL THEN TRUE ELSE FALSE END AS is_general_holiday,
                          CASE WHEN sp.is_special = 1 THEN TRUE ELSE FALSE END AS is_special_holiday,
                          CASE WHEN hr.is_employee_off_day(e.uuid, d.punch_date)=true THEN TRUE ELSE FALSE END AS is_off_day,
                          CASE 
                            WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
                              AND MIN(pl.punch_time) IS NOT NULL THEN TRUE
                            ELSE FALSE
                          END AS is_present,
                          CASE 
                            WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
                              AND MIN(pl.punch_time) IS NOT NULL AND MIN(pl.punch_time)::time > s.late_time::time THEN TRUE
                            ELSE FALSE
                          END AS is_late,
                          CASE 
                            WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
                              AND MAX(pl.punch_time) IS NOT NULL AND MAX(pl.punch_time)::time < s.early_exit_before::time THEN TRUE
                            ELSE FALSE
                          END AS is_early_exit,
                          CASE WHEN al.reason IS NOT NULL THEN al.reason ELSE NULL END AS leave_reason,
                          dept.department AS department_name,
                          des.designation AS designation_name,
                          et.name AS employment_type_name,
                          w.name AS workplace_name,
                          CASE 
                            WHEN gh.date IS NULL AND sp.is_special IS NULL AND hr.is_employee_off_day(e.uuid, d.punch_date)=false AND al.reason IS NULL
                              AND MIN(pl.punch_time) IS NULL THEN TRUE
                            ELSE FALSE
                          END AS is_absent,
                          CASE WHEN ap_late.employee_uuid IS NOT NULL THEN TRUE ELSE FALSE END AS is_late_application,
                          CASE WHEN me_field.employee_uuid IS NOT NULL THEN TRUE ELSE FALSE END AS is_field_visit
                        FROM hr.employee e
                        CROSS JOIN dates d
                        LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = d.punch_date
                        LEFT JOIN LATERAL (
                          SELECT r.shifts_uuid AS shifts_uuid,
                                r.shift_group_uuid AS shift_group_uuid
                          FROM hr.roster r
                          WHERE r.shift_group_uuid = (
                            SELECT el.type_uuid
                            FROM hr.employee_log el
                            WHERE el.employee_uuid = e.uuid
                              AND el.type = 'shift_group'
                              AND el.effective_date::date <= d.punch_date
                            ORDER BY el.effective_date DESC
                            LIMIT 1
                          )
                          AND r.effective_date <= d.punch_date
                          ORDER BY r.effective_date DESC
                          LIMIT 1
                        ) sg_sel ON TRUE
                        LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
                        LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                        LEFT JOIN hr.general_holidays gh ON gh.date = d.punch_date
                        LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                        LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
                        LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                        LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                        LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
                        LEFT JOIN hr.apply_late ap_late ON ap_late.employee_uuid = e.uuid
                            AND ap_late.date::date = d.punch_date
                            AND ap_late.status = 'approved'
                        LEFT JOIN hr.manual_entry me_field ON me_field.employee_uuid = e.uuid
                          AND me_field.entry_time::date = d.punch_date
                          AND me_field.approval = 'approved'
                          AND me_field.type = 'field_visit'
                        LEFT JOIN LATERAL (
                          SELECT 1 AS is_special
                          FROM hr.special_holidays sh
                          WHERE d.punch_date BETWEEN sh.from_date::date AND sh.to_date::date
                          LIMIT 1
                        ) AS sp ON TRUE
                        LEFT JOIN hr.apply_leave al ON al.employee_uuid = e.uuid
                          AND d.punch_date BETWEEN al.from_date::date AND al.to_date::date
                          AND al.approval = 'approved'
                        GROUP BY e.uuid, u.uuid, u.name, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, gh.date, sp.is_special,al.reason, dept.department, des.designation, et.name, w.name, ap_late.employee_uuid, me_field.employee_uuid, d.punch_date, sg.name, e.start_date
                      )
                      SELECT
                        ad.employee_uuid,
                        ad.user_uuid,
                        ad.employee_name,
                        ad.designation_name,
                        ad.department_name,
                        ad.workplace_name,
                        ad.employment_type_name,
                        ad.start_date,
                        (SELECT COUNT(*) FROM dates)::int AS total_days,
                        COUNT(*) FILTER (WHERE ad.is_present)::float8    AS present_days,
                        COUNT(*) FILTER (WHERE ad.is_late)::float8        AS late_days,
                        COUNT(*) FILTER (WHERE ad.is_early_exit)::float8   AS early_exit_days,
                        COUNT(*) FILTER (WHERE ad.leave_reason IS NOT NULL)::float8  AS leave_days,
                        COUNT(*) FILTER (WHERE ad.is_off_day AND NOT ad.is_general_holiday AND NOT ad.is_special_holiday)::float8 AS off_days,
                        COUNT(*) FILTER (WHERE ad.is_general_holiday)::float8  AS general_holidays,
                        COUNT(*) FILTER (WHERE ad.is_special_holiday)::float8  AS special_holidays,
                        ((SELECT COUNT(*) FROM dates) - COUNT(*) FILTER (WHERE ad.is_off_day OR ad.is_general_holiday OR ad.is_special_holiday OR ad.leave_reason IS NOT NULL))::int AS working_days,
                        COUNT(*) FILTER (WHERE ad.is_absent)::float8       AS absent_days,
                        COUNT(*) FILTER (WHERE ad.is_late_application)::float8  AS approved_lates,
                        COUNT(*) FILTER (WHERE ad.is_field_visit)::float8  AS field_visit_days,
                        -- Sum late_hours only for rows flagged as is_late
                        COALESCE(SUM(ad.late_hours) FILTER (WHERE ad.is_late), 0)::float8      AS total_late_hours,
                        -- Sum early_exit_hours only for rows flagged as is_early_exit
                        COALESCE(SUM(ad.early_exit_hours) FILTER (WHERE ad.is_early_exit), 0)::float8 AS total_early_exit_hours,
                        COALESCE(SUM(ad.working_hours), 0)::float8   AS working_hours,
                        COALESCE(SUM(ad.expected_working_hours), 0)::float8 AS expected_hours,
                        COALESCE(SUM(ad.overtime_hours), 0)::float8  AS overtime_hours
                      FROM attendance_data ad
                      WHERE ${employee_uuid ? sql`ad.employee_uuid = ${employee_uuid}` : sql`TRUE`}
                      GROUP BY ad.employee_uuid, ad.user_uuid, ad.employee_name, ad.designation_name, ad.department_name, ad.workplace_name, ad.employment_type_name, ad.start_date
                      ORDER BY ad.employee_name
                    `;

  const monthlyData = await db.execute(query);

  return c.json(monthlyData.rows || [], HSCode.OK);
};

export const getDailyEmployeeAttendanceReport: AppRouteHandler<GetDailyEmployeeAttendanceReportRoute> = async (c: any) => {
  const { date, employee_uuid } = c.req.valid('query');

  const query = sql`
                WITH date_series AS (
                  SELECT generate_series(${date}::date, ${date}::date, INTERVAL '1 day')::date AS punch_date
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
                    e.start_date::date,
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
                          OR hr.is_employee_off_day(e.uuid,ud.punch_date)=true
                          OR al.reason IS NOT NULL THEN 0
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
                          WHEN gh.date IS NOT NULL
                            OR sp.is_special = 1
                            OR hr.is_employee_off_day(e.uuid,ud.punch_date)=true
                            OR al.reason IS NOT NULL THEN 0
                          ELSE (EXTRACT(EPOCH FROM (s.end_time::time - s.start_time::time)) / 3600)::float8
                        END
                      , 0)
                    , 0)::float8 AS overtime_hours,
                    CASE
                        WHEN gh.date IS NOT NULL OR sp.is_special = 1 THEN 'Holiday'
                        WHEN hr.is_employee_off_day(e.uuid,ud.punch_date)=true THEN 'Off Day'
                        WHEN al.reason IS NOT NULL THEN 'Leave'
                        WHEN MIN(pl.punch_time) IS NULL THEN 'Absent'
                        WHEN MIN(pl.punch_time)::time > s.late_time::time THEN 'Late'
                        WHEN MAX(pl.punch_time)::time < s.early_exit_before::time THEN 'Early Exit'
                        ELSE 'Present'
                    END as status,
                    dept.department AS department_name,
                    des.designation AS designation_name,
                    et.name AS employment_type_name,
                    w.name AS workplace_name,
                    sg.name AS shift_group_name
                  FROM hr.employee e
                  LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                  LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                  LEFT JOIN LATERAL (
                              SELECT r.shifts_uuid AS shifts_uuid,
                              r.shift_group_uuid
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
                              AND r.effective_date <= ud.punch_date::date
                              ORDER BY r.effective_date DESC
                              LIMIT 1
                          ) sg_sel ON TRUE
                  LEFT JOIN hr.shifts s ON s.uuid = sg_sel.shifts_uuid
                  LEFT JOIN hr.shift_group sg ON sg.uuid = sg_sel.shift_group_uuid
                  LEFT JOIN hr.general_holidays gh ON gh.date = ud.punch_date
                  LEFT JOIN hr.users u ON e.user_uuid = u.uuid
                  LEFT JOIN hr.department dept ON u.department_uuid = dept.uuid
                  LEFT JOIN hr.designation des ON u.designation_uuid = des.uuid
                  LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
                  LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
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
                  GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date, s.name, s.start_time, s.end_time, s.late_time, s.early_exit_before, sp.is_special,gh.date, al.reason,dept.department, des.designation, et.name, e.uuid, w.name, sg.name, e.start_date
                )
                SELECT
                    uuid,
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
                    start_date::date,
                    shift_group_name
                FROM attendance_data
                ORDER BY employee_name, punch_date;
              `;

  const employeeAttendanceReportPromise = db.execute(query);

  const data = await employeeAttendanceReportPromise;

  return c.json(data.rows || [], HSCode.OK);
};

export const getMonthlyAttendanceReport2: AppRouteHandler<GetMonthlyAttendanceReportRoute> = async (c: any) => {
  let { from_date, to_date, employee_uuid } = c.req.valid('query');

  if (employee_uuid === '' || employee_uuid === null || employee_uuid === undefined) {
    employee_uuid = null;
  }

  const holidays = await getHolidayCountsDateRange(from_date, to_date);
  const totalOffDays = await getOffDayCountsDateRange(employee_uuid, from_date, to_date);

  // Generate all dates in the range
  const startDate = new Date(from_date.replace(/\//g, '-'));
  const endDate = new Date(to_date.replace(/\//g, '-'));
  const dates: string[] = [];
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }

  let presentDays = 0;
  let lateDays = 0;
  let earlyExitDays = 0;
  let leaveDays = 0;
  let absentDays = 0;
  let totalLateHours = 0;
  let totalEarlyExitHours = 0;
  let totalWorkingHours = 0;
  let totalExpectedHours = 0;
  let overtimeHours = 0;
  let approvedLates = 0;
  let fieldVisitDays = 0;

  // For each date, determine attendance status
  for (const date of dates) {
    const dailyStatus = await getEmployeeAttendanceForDate(employee_uuid, date);

    // console.log(`Date: ${date}, Status:`, dailyStatus);

    if (dailyStatus) {
      if (dailyStatus.is_present) {
        presentDays += 1;
      }
      if (dailyStatus.is_late) {
        lateDays += 1;
        totalLateHours += Number(dailyStatus.late_hours || 0);
      }
      if (dailyStatus.is_early_exit) {
        earlyExitDays += 1;
        totalEarlyExitHours += Number(dailyStatus.early_exit_hours || 0);
      }
      if (dailyStatus.leave_reason) {
        leaveDays += 1;
      }
      if (dailyStatus.is_absent) {
        absentDays += 1;
      }
      if (dailyStatus.working_hours) {
        totalWorkingHours += Number(dailyStatus.working_hours || 0);
      }
      if (dailyStatus.expected_working_hours) {
        totalExpectedHours += Number(dailyStatus.expected_working_hours || 0);
      }
      if (dailyStatus.overtime_hours) {
        overtimeHours += Number(dailyStatus.overtime_hours || 0);
      }
      if (dailyStatus.is_field_visit) {
        fieldVisitDays += 1;
      }
      if (dailyStatus.is_late_application) {
        approvedLates += 1;
      }
    }
  }

  const employeeQuery = sql`
    SELECT e.uuid AS employee_uuid, u.uuid AS user_uuid, u.name AS employee_name,
           d.designation AS designation_name, dep.department AS department_name,
           w.name AS workplace_name, et.name AS employment_type_name
    FROM hr.employee e
    LEFT JOIN hr.users u ON e.user_uuid = u.uuid
    LEFT JOIN hr.designation d ON u.designation_uuid = d.uuid
    LEFT JOIN hr.department dep ON u.department_uuid = dep.uuid
    LEFT JOIN hr.workplace w ON e.workplace_uuid = w.uuid
    LEFT JOIN hr.employment_type et ON e.employment_type_uuid = et.uuid
    WHERE ${employee_uuid ? sql`e.uuid = ${employee_uuid}` : sql`TRUE`}
  `;
  const employeeData = await db.execute(employeeQuery);

  // Format the result (single row per employee)
  const formattedData = employeeData.rows.map((emp: any) => ({
    employee_uuid: emp.employee_uuid,
    user_uuid: emp.user_uuid,
    employee_name: emp.employee_name,
    designation_name: emp.designation_name,
    department_name: emp.department_name,
    workplace_name: emp.workplace_name,
    employment_type_name: emp.employment_type_name,
    total_days: totalDays,
    present_days: presentDays,
    late_days: lateDays,
    early_exit_days: earlyExitDays,
    leave_days: leaveDays,
    off_days: Number(totalOffDays),
    general_holidays: Number(holidays.general),
    special_holidays: Number(holidays.special),
    working_days: totalDays - Number(holidays.general) - Number(holidays.special) - Number(totalOffDays) - Number(leaveDays),
    absent_days: absentDays,
    approved_lates: approvedLates,
    field_visit_days: fieldVisitDays,
    total_late_hours: totalLateHours,
    total_early_exit_hours: totalEarlyExitHours,
    working_hours: totalWorkingHours,
    expected_hours: totalExpectedHours,
    overtime_hours: overtimeHours,
  }));

  return c.json(formattedData || [], HSCode.OK);
};
