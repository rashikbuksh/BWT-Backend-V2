import type { AppRouteHandler } from '@/lib/types';

import { sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';

import type { GetEmployeeAttendanceReportRoute } from './routes';

export const getEmployeeAttendanceReport: AppRouteHandler<GetEmployeeAttendanceReportRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const { from_date, to_date } = c.req.valid('query');

  const query = sql`
                WITH date_series AS (
                  SELECT generate_series(${from_date}::date, ${to_date}::date, INTERVAL '1 day')::date AS punch_date
                ),
                user_dates AS (
                  SELECT u.uuid AS user_uuid, u.name AS employee_name, d.punch_date
                  FROM hr.users u
                  CROSS JOIN date_series d
                )
                SELECT
                  ud.user_uuid,
                  ud.employee_name,
                  DATE(ud.punch_date) AS punch_date,
                  MIN(pl.punch_time) AS entry_time,
                  MAX(pl.punch_time) AS exit_time,
                  (EXTRACT(EPOCH FROM MAX(pl.punch_time) - MIN(pl.punch_time)) / 3600)::float8 AS hours_worked,
                  (EXTRACT(EPOCH FROM MAX(s.end_time) - MIN(s.start_time)) / 3600)::float8 AS expected_hours
                FROM hr.employee e
                LEFT JOIN user_dates ud ON e.user_uuid = ud.user_uuid
                LEFT JOIN hr.punch_log pl ON pl.employee_uuid = e.uuid AND DATE(pl.punch_time) = DATE(ud.punch_date)
                LEFT JOIN hr.shift_group sg ON e.shift_group_uuid = sg.uuid
                LEFT JOIN hr.shifts s ON sg.shifts_uuid = s.uuid
                WHERE 
                  e.uuid = ${employee_uuid}
                GROUP BY ud.user_uuid, ud.employee_name, ud.punch_date
                ORDER BY ud.user_uuid, ud.punch_date;
              `;

  const employeeAttendanceReportPromise = db.execute(query);

  const data = await employeeAttendanceReportPromise;

  // const formattedData = data.rows.map((row: any) => ({
  //   user_uuid: row.user_uuid,
  //   employee_name: row.employee_name,
  //   punch_date: row.punch_date,
  //   entry_time: row.entry_time,
  //   exit_time: row.exit_time,
  //   hours_worked: Number.parseFloat(row.hours_worked),
  //   expected_hours: Number.parseFloat(row.expected_hours),
  // }));

  return c.json(data.rows || [], HSCode.OK);
};
