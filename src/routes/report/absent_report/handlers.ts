import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { getHolidayCountsDateRange } from '@/lib/variables';

import type { AbsentSummaryReportRoute, DailyAbsentReportRoute } from './routes';

export const dailyAbsentReport: AppRouteHandler<DailyAbsentReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, status, department_uuid } = c.req.valid('query');

  const query = sql`
    SELECT
        employee.uuid as employee_uuid,
        users.name as employee_name,
        employee.employee_id,
        workplace.name as workplace_name,
        employment_type.name as employment_type_name,
        shift_group.name as shift_group_name,
        shifts.start_time,
        shifts.end_time,
        department.department as department_name,
        designation.designation as designation_name,
        CASE 
            WHEN punch_log.employee_uuid IS NULL THEN 'Absent'
            ELSE 'Present'
        END as attendance_status,

    -- new: date of last absence (no punch & no approved leave)
      (
        SELECT MAX(DATE(pl2.punch_time))
        FROM hr.punch_log pl2
        LEFT JOIN hr.apply_leave al2 
          ON pl2.employee_uuid = al2.employee_uuid 
          AND al2.approval = 'approved'
          AND DATE(pl2.punch_time) BETWEEN al2.from_date::date AND al2.to_date::date
        WHERE pl2.employee_uuid = employee.uuid
          AND al2.employee_uuid IS NULL
      ) AS last_absent,

      -- new: count of absent days in the last 30 calendar days
      (
        SELECT COUNT(*)
        FROM (
          SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            '1 day'
          )::date AS d
        ) AS days
        LEFT JOIN hr.punch_log pl3 
          ON pl3.employee_uuid = employee.uuid 
          AND DATE(pl3.punch_time) = days.d
        LEFT JOIN hr.apply_leave al3 
          ON al3.employee_uuid = employee.uuid 
          AND al3.approval = 'approved'
          AND days.d BETWEEN al3.from_date::date AND al3.to_date::date
        WHERE pl3.employee_uuid IS NULL 
          AND al3.employee_uuid IS NULL
      ) AS absent_last_30_days,
       line_manager.name as line_manager_name,
       (
          SELECT COUNT(*)
          FROM hr.employee e
          LEFT JOIN hr.users u ON e.user_uuid = u.uuid
          WHERE
            ${status === 'active'
              ? sql`e.is_resign = false AND e.status = true`
              : status === 'inactive'
                ? sql`e.is_resign = false AND e.status = false`
                : status === 'resigned'
                  ? sql`e.is_resign = true`
                  : sql`e.status = true`}
            ${department_uuid !== 'undefined' && department_uuid ? sql`AND u.department_uuid = ${department_uuid}` : sql``}
            AND e.exclude_from_attendance = false
            ${employee_uuid ? sql`AND e.uuid = ${employee_uuid}` : sql``}
        ) AS total_employee
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
        hr.workplace ON employee.workplace_uuid = workplace.uuid
    LEFT JOIN 
        hr.users line_manager ON employee.line_manager_uuid = line_manager.uuid
    LEFT JOIN
        hr.shift_group ON employee.shift_group_uuid = shift_group.uuid
    LEFT JOIN
        hr.shifts ON shift_group.shifts_uuid = shifts.uuid
    LEFT JOIN
        hr.punch_log ON employee.uuid = punch_log.employee_uuid 
        AND ${from_date ? sql`DATE(punch_log.punch_time) = ${from_date}` : sql`DATE(punch_log.punch_time) = CURRENT_DATE`}
    LEFT JOIN
        hr.apply_leave ON employee.uuid = apply_leave.employee_uuid
        AND apply_leave.approval = 'approved'
        AND ${from_date ? sql`${from_date} BETWEEN apply_leave.from_date::date AND apply_leave.to_date::date` : sql`CURRENT_DATE BETWEEN apply_leave.from_date::date AND apply_leave.to_date::date`}
    WHERE 
         ${status === 'active'
            ? sql`employee.is_resign = false AND employee.status = true`
            : status === 'inactive'
              ? sql`employee.is_resign = false AND employee.status = false`
              : status === 'resigned'
                ? sql`employee.is_resign = true`
                : sql`employee.status = true`}
         ${department_uuid !== 'undefined' && department_uuid ? sql`AND users.department_uuid = ${department_uuid}` : sql``}
        AND employee.exclude_from_attendance = false
        ${employee_uuid ? sql`AND employee.uuid = ${employee_uuid}` : sql``}
        AND punch_log.employee_uuid IS NULL  -- Only absent employees
        AND apply_leave.employee_uuid IS NULL  -- Exclude employees on approved leave
    ORDER BY
        users.name
  `;

  const data = await db.execute(query);

  return c.json(data.rows, HSCode.OK);
};

export const absentSummaryReport: AppRouteHandler<AbsentSummaryReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date, status, department_uuid } = c.req.valid('query');

  const query = sql`
    WITH absence_summary AS (
        SELECT 
            employee.uuid as employee_uuid,
            users.name as employee_name,
            employee.employee_id,
            department.department as department_name,
            designation.designation as designation_name,
            employment_type.name as employment_type_name,
            workplace.name as workplace_name,
            
            -- Count total working days (excluding weekends/holidays)
            COUNT(DISTINCT calendar_date.date) as total_working_days,
            
            -- Count days with punch records
            COUNT(DISTINCT DATE(punch_log.punch_time)) as days_present,
            
            -- Count approved leave days
            COALESCE(SUM(
                CASE 
                    WHEN apply_leave.type = 'full' THEN (apply_leave.to_date::date - apply_leave.from_date::date + 1)
                    WHEN apply_leave.type = 'half' THEN (apply_leave.to_date::date - apply_leave.from_date::date + 1) * 0.5
                    ELSE 0
                END
            ), 0) as approved_leave_days,
            
            -- Calculate absent days (working days - present days - approved leave days)
            (COUNT(DISTINCT calendar_date.date) - COUNT(DISTINCT DATE(punch_log.punch_time)) - COALESCE(SUM(
                CASE 
                    WHEN apply_leave.type = 'full' THEN (apply_leave.to_date::date - apply_leave.from_date::date + 1)
                    WHEN apply_leave.type = 'half' THEN (apply_leave.to_date::date - apply_leave.from_date::date + 1) * 0.5
                    ELSE 0
                END
            ), 0)) as unauthorized_absent_days,

            -- Absent Dates (only dates without punch records and not on leave)
            json_agg(
                json_build_object(
                    'date', calendar_date.date,
                    'shift_name', shifts.name,
                    'start_time', shifts.start_time,
                    'end_time', shifts.end_time
                )
            ) FILTER (WHERE punch_log.employee_uuid IS NULL AND apply_leave.employee_uuid IS NULL) as absent_days,
            line_manager.name as line_manager_name,
            (
              SELECT COUNT(*)
              FROM hr.employee e
              LEFT JOIN hr.users u ON e.user_uuid = u.uuid
              WHERE
                ${status === 'active'
                  ? sql`e.is_resign = false AND e.status = true`
                  : status === 'inactive'
                    ? sql`e.is_resign = false AND e.status = false`
                    : status === 'resigned'
                      ? sql`e.is_resign = true`
                      : sql`e.status = true`}
                ${department_uuid !== 'undefined' && department_uuid ? sql` AND u.department_uuid = ${department_uuid}` : sql``}
                AND e.exclude_from_attendance = false
                ${employee_uuid ? sql`AND e.uuid = ${employee_uuid}` : sql``}
            ) AS total_employee
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
            hr.workplace ON employee.workplace_uuid = workplace.uuid
        LEFT JOIN
            hr.users line_manager ON employee.line_manager_uuid = line_manager.uuid
        LEFT JOIN
            -- Generate a calendar of working days for the specified date range
            (SELECT generate_series(
                ${from_date ? sql`${from_date}::date` : sql`CURRENT_DATE`},
                ${to_date ? sql`${to_date}::date` : sql`CURRENT_DATE`},
                '1 day'::interval
            )::date as date) as calendar_date ON TRUE
        LEFT JOIN
            hr.punch_log ON employee.uuid = punch_log.employee_uuid 
            AND DATE(punch_log.punch_time) = calendar_date.date
        LEFT JOIN
            hr.apply_leave ON employee.uuid = apply_leave.employee_uuid
            AND apply_leave.approval = 'approved'
            AND calendar_date.date BETWEEN apply_leave.from_date::date AND apply_leave.to_date::date
        LEFT JOIN
            hr.general_holidays ON calendar_date.date = general_holidays.date::date
        LEFT JOIN
            hr.special_holidays ON calendar_date.date BETWEEN special_holidays.from_date::date AND special_holidays.to_date::date
            AND employee.workplace_uuid = special_holidays.workplace_uuid
        LEFT JOIN
            hr.shift_group sg_calendar ON employee.shift_group_uuid = sg_calendar.uuid
        LEFT JOIN
            hr.shifts ON sg_calendar.shifts_uuid = shifts.uuid
        LEFT JOIN 
            hr.roster ON shifts.uuid = roster.shifts_uuid AND sg_calendar.uuid = roster.shift_group_uuid
        WHERE 
           ${status === 'active'
              ? sql`employee.is_resign = false AND employee.status = true`
              : status === 'inactive'
                ? sql`employee.is_resign = false AND employee.status = false`
                : status === 'resigned'
                  ? sql`employee.is_resign = true`
                  : sql`employee.status = true`}
            ${department_uuid !== 'undefined' && department_uuid ? sql` AND users.department_uuid = ${department_uuid}` : sql``}
            AND employee.exclude_from_attendance = false
            ${employee_uuid ? sql`AND employee.uuid = ${employee_uuid}` : sql``}
            -- Exclude off days based on shift group off_days
            AND NOT (CASE WHEN calendar_date.date < roster.effective_date THEN sg_calendar.off_days::jsonb ? LPAD(LOWER(TO_CHAR(calendar_date.date, 'Day')), 3) ELSE roster.off_days::jsonb ? LPAD(LOWER(TO_CHAR(calendar_date.date, 'Day')), 3) END)
            AND general_holidays.uuid IS NULL
            AND special_holidays.uuid IS NULL
        GROUP BY
            employee.uuid, users.name, employee.employee_id, department.department, 
            designation.designation, employment_type.name, workplace.name, line_manager.name
    )
    SELECT 
        *,
        ROUND((days_present::numeric / NULLIF(total_working_days, 0)) * 100, 2) as attendance_percentage,
        ROUND((unauthorized_absent_days::numeric / NULLIF(total_working_days, 0)) * 100, 2) as absence_percentage
    FROM absence_summary
    ORDER BY unauthorized_absent_days DESC, employee_name
  `;

  const data = await db.execute(query);

  // Post-process the data to remove duplicates and convert string numbers to actual numbers
  const processedData = data.rows.map((row: any) => ({
    ...row,
    total_working_days: Number.parseInt(row.total_working_days) || 0,
    days_present: Number.parseInt(row.days_present) || 0,
    approved_leave_days: Number.parseFloat(row.approved_leave_days) || 0,
    unauthorized_absent_days: Number.parseFloat(row.unauthorized_absent_days) || 0,
    attendance_percentage: Number.parseFloat(row.attendance_percentage) || 0,
    absence_percentage: Number.parseFloat(row.absence_percentage) || 0,
    absent_days: row.absent_days
      ? row.absent_days.filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) =>
            t.date === item.date && t.shift_name === item.shift_name,
          ),
        )
      : [],
  }));

  return c.json(processedData, HSCode.OK);
};

export const absentSummaryReport2: AppRouteHandler<AbsentSummaryReportRoute> = async (c: any) => {
  const { employee_uuid, from_date, to_date, status, department_uuid } = c.req.valid('query');

  const holidays = await getHolidayCountsDateRange(from_date, to_date);

  const query = sql`
    WITH absence_summary AS (
        SELECT 
            employee.uuid as employee_uuid,
            users.name as employee_name,
            employee.employee_id,
            department.department as department_name,
            designation.designation as designation_name,
            employment_type.name as employment_type_name,
            workplace.name as workplace_name,
            
            -- Count total working days (excluding weekends/holidays)
             ((${to_date}::date - ${from_date}::date + 1) - (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_summary.total_off_days, 0) + ${holidays.general} + ${holidays.special}))::float8  as total_working_days,
            
            -- Count days with punch records
            (COALESCE(att_summary.present_days, 0)::float8 + COALESCE(att_summary.late_days, 0)::float8) as days_present,
            
            -- Count approved leave days
            COALESCE(leave_summary.total_leave_days, 0) as approved_leave_days,
            
            -- Calculate absent days (working days - present days - approved leave days)
          ((${to_date}::date - ${from_date}::date + 1) - (COALESCE(leave_summary.total_leave_days, 0) + COALESCE(off_summary.total_off_days, 0) +  ${holidays.general} + ${holidays.special}))::float8 - ( COALESCE(att_summary.present_days, 0)::float8 + COALESCE(att_summary.late_days, 0)::float8) as unauthorized_absent_days,

            -- Absent Dates (only dates without punch records and not on leave)
            json_agg(
                json_build_object(
                    'date', calendar_date.date,
                    'shift_name', shifts.name,
                    'start_time', shifts.start_time,
                    'end_time', shifts.end_time
                )
            ) FILTER (WHERE punch_log.employee_uuid IS NULL AND apply_leave.employee_uuid IS NULL) as absent_days,
            line_manager.name as line_manager_name,
            (
              SELECT COUNT(*)
              FROM hr.employee e
              LEFT JOIN hr.users u ON e.user_uuid = u.uuid
              WHERE
                ${status === 'active'
                  ? sql`e.is_resign = false AND e.status = true`
                  : status === 'inactive'
                    ? sql`e.is_resign = false AND e.status = false`
                    : status === 'resigned'
                      ? sql`e.is_resign = true`
                      : sql`e.status = true`}
                ${department_uuid !== 'undefined' && department_uuid ? sql` AND u.department_uuid = ${department_uuid}` : sql``}
                AND e.exclude_from_attendance = false
                ${employee_uuid ? sql`AND e.uuid = ${employee_uuid}` : sql``}
            ) AS total_employee
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
            hr.workplace ON employee.workplace_uuid = workplace.uuid
        LEFT JOIN
            hr.users line_manager ON employee.line_manager_uuid = line_manager.uuid

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

        WHERE 
           ${status === 'active'
              ? sql`employee.is_resign = false AND employee.status = true`
              : status === 'inactive'
                ? sql`employee.is_resign = false AND employee.status = false`
                : status === 'resigned'
                  ? sql`employee.is_resign = true`
                  : sql`employee.status = true`}
            ${department_uuid !== 'undefined' && department_uuid ? sql` AND users.department_uuid = ${department_uuid}` : sql``}
            AND employee.exclude_from_attendance = false
            ${employee_uuid ? sql`AND employee.uuid = ${employee_uuid}` : sql``}
        GROUP BY
            employee.uuid, users.name, employee.employee_id, department.department, 
            designation.designation, employment_type.name, workplace.name, line_manager.name
    )
    SELECT 
        *,
        ROUND((days_present::numeric / NULLIF(total_working_days, 0)) * 100, 2) as attendance_percentage,
        ROUND((unauthorized_absent_days::numeric / NULLIF(total_working_days, 0)) * 100, 2) as absence_percentage
    FROM absence_summary
    ORDER BY unauthorized_absent_days DESC, employee_name
  `;

  const data = await db.execute(query);

  // Post-process the data to remove duplicates and convert string numbers to actual numbers
  const processedData = data.rows.map((row: any) => ({
    ...row,
    total_working_days: Number.parseInt(row.total_working_days) || 0,
    days_present: Number.parseInt(row.days_present) || 0,
    approved_leave_days: Number.parseFloat(row.approved_leave_days) || 0,
    unauthorized_absent_days: Number.parseFloat(row.unauthorized_absent_days) || 0,
    attendance_percentage: Number.parseFloat(row.attendance_percentage) || 0,
    absence_percentage: Number.parseFloat(row.absence_percentage) || 0,
    absent_days: row.absent_days
      ? row.absent_days.filter((item: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) =>
            t.date === item.date && t.shift_name === item.shift_name,
          ),
        )
      : [],
  }));

  return c.json(processedData, HSCode.OK);
};
