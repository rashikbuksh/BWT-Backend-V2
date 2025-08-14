import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetEmployeeSalaryDetailsByYearDateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, salary_entry, users } from '../schema';

const createdByUser = alias(users, 'createdByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(salary_entry).values(value).returning({
    name: salary_entry.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(salary_entry)
    .set(updates)
    .where(eq(salary_entry.uuid, uuid))
    .returning({
      name: salary_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(salary_entry)
    .where(eq(salary_entry.uuid, uuid))
    .returning({
      name: salary_entry.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { date } = c.req.valid('query');

  const salaryIncrementPromise = db
    .select({
      uuid: salary_entry.uuid,
      employee_uuid: salary_entry.employee_uuid,
      employee_name: users.name,
      type: salary_entry.type,
      amount: PG_DECIMAL_TO_FLOAT(salary_entry.amount),
      month: salary_entry.month,
      year: salary_entry.year,
      created_by: salary_entry.created_by,
      created_by_name: createdByUser.name,
      created_at: salary_entry.created_at,
      updated_at: salary_entry.updated_at,
      remarks: salary_entry.remarks,
      loan_amount: PG_DECIMAL_TO_FLOAT(salary_entry.loan_amount),
      advance_amount: PG_DECIMAL_TO_FLOAT(salary_entry.advance_amount),
      year_month: sql`TO_CHAR(TO_TIMESTAMP(${salary_entry.year} || '-' || LPAD(${salary_entry.month}::text, 2, '0') || '-01 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD HH24:MI:SS')`,
    })
    .from(salary_entry)
    .leftJoin(
      createdByUser,
      eq(salary_entry.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(salary_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .orderBy(desc(salary_entry.created_at));

  if (date) {
    const [year, month] = date.split('-').map(Number);
    salaryIncrementPromise.where(
      and(eq(salary_entry.year, year), eq(salary_entry.month, month)),
    );
  }

  const data = await salaryIncrementPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const salaryIncrementPromise = db
    .select({
      uuid: salary_entry.uuid,
      employee_uuid: salary_entry.employee_uuid,
      employee_name: users.name,
      type: salary_entry.type,
      amount: PG_DECIMAL_TO_FLOAT(salary_entry.amount),
      month: salary_entry.month,
      year: salary_entry.year,
      created_by: salary_entry.created_by,
      created_by_name: createdByUser.name,
      created_at: salary_entry.created_at,
      updated_at: salary_entry.updated_at,
      remarks: salary_entry.remarks,
      loan_amount: PG_DECIMAL_TO_FLOAT(salary_entry.loan_amount),
      advance_amount: PG_DECIMAL_TO_FLOAT(salary_entry.advance_amount),
      year_month: sql`TO_CHAR(TO_TIMESTAMP(${salary_entry.year} || '-' || LPAD(${salary_entry.month}::text, 2, '0') || '-01 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 'YYYY-MM-DD HH24:MI:SS')`,
    })
    .from(salary_entry)
    .leftJoin(
      createdByUser,
      eq(salary_entry.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(salary_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(eq(salary_entry.uuid, uuid));

  const [data] = await salaryIncrementPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getEmployeeSalaryDetailsByYearDate: AppRouteHandler<GetEmployeeSalaryDetailsByYearDateRoute> = async (c: any) => {
  const { year, month } = c.req.valid('param');

  const { employee_uuid } = c.req.valid('query');

  // console.log(`Fetching salary details for year: ${year}, month: ${month}, employee_uuid: ${employee_uuid}`);

  const totalDays = new Date(year, month, 0).getDate();
  // console.log(`Total days in month: ${totalDays}`);
  const date = new Date(year, month - 1, 1); // JS months are 0-based
  date.setMonth(date.getMonth() - 1);
  const prevMonth = date.getMonth() + 1; // back to 1-based
  const prevYear = date.getFullYear();

  // console.log(prevMonth, prevYear);

  const SpecialHolidaysQuery = sql`
                SELECT
                  SUM(sh.to_date::date - sh.from_date::date + 1) -
                  SUM(
                    CASE
                      WHEN sh.to_date::date > (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date
                        THEN sh.to_date::date - (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date
                      ELSE 0
                    END
                    +
                    CASE
                      WHEN sh.from_date::date < TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD')::date
                        THEN TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD')::date - sh.from_date::date
                      ELSE 0
                    END
                  ) AS total_special_holidays
                FROM hr.special_holidays sh
                WHERE
                (
                  EXTRACT(YEAR FROM sh.to_date) > ${year}
                  OR (EXTRACT(YEAR FROM sh.to_date) = ${year} AND EXTRACT(MONTH FROM sh.to_date) >= ${month})
                )
                AND (
                  EXTRACT(YEAR FROM sh.from_date) < ${year}
                  OR (EXTRACT(YEAR FROM sh.from_date) = ${year} AND EXTRACT(MONTH FROM sh.from_date) <= ${month})
                )
            `;

  const generalHolidayQuery = sql`
            SELECT
              COUNT(*) AS total_off_days
            FROM 
              hr.general_holidays gh
            WHERE
              EXTRACT(YEAR FROM gh.date) = ${year}
              AND EXTRACT(MONTH FROM gh.date) = ${month}
            `;

  const specialHolidaysPromise = db.execute(SpecialHolidaysQuery);
  const generalHolidaysPromise = db.execute(generalHolidayQuery);

  const [specialHolidaysResult, generalHolidaysResult] = await Promise.all([
    specialHolidaysPromise,
    generalHolidaysPromise,
  ]);

  const total_special_holidays = specialHolidaysResult.rows[0]?.total_special_holidays || 0;
  const total_general_holidays = generalHolidaysResult.rows[0]?.total_off_days || 0;

  const query = sql`
            SELECT 
                employee.uuid as employee_uuid,
                employeeUser.uuid as employee_user_uuid,
                employeeUser.name as employee_name,
                employee.joining_amount::float8,
                employee.start_date as joining_date,
                employee.created_at,
                employee.updated_at,
                employee.remarks,
                COALESCE(total_increment.total_salary_increment, 0)::float8 AS total_incremented_salary,
                COALESCE(attendance_summary.present_days, 0)::float8 AS present_days,
                COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
                COALESCE(leave_summary.total_leave_days, 0)::float8 AS total_leave_days,
                COALESCE(
                  employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0),
                  employee.joining_amount
                )::float8 AS total_salary,
                COALESCE(off_days_summary.total_off_days, 0)::float8 AS week_days,
                COALESCE(${total_general_holidays}, 0)::float8 AS total_general_holidays,
                COALESCE(${total_special_holidays}, 0)::float8 AS total_special_holidays,
                COALESCE(
                  off_days_summary.total_off_days + ${total_general_holidays} + ${total_special_holidays},
                  0
                )::float8 AS total_off_days_including_holidays,
                COALESCE(
                  attendance_summary.present_days + attendance_summary.late_days + leave_summary.total_leave_days,
                  0
                )::float8 AS total_present_days,
                
                COALESCE(
                    (
                      (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date 
                      - (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD'))::date
                      + 1
                    ), 0
                    )
                    - (
                    COALESCE(attendance_summary.present_days, 0) + 
                    COALESCE(attendance_summary.late_days, 0) + 
                    COALESCE(leave_summary.total_leave_days, 0) + 
                    COALESCE(${total_general_holidays}::int, 0) + 
                    COALESCE(${total_special_holidays}::int, 0)
                    )::float8 AS absent_days,
                COALESCE(
                  COALESCE(attendance_summary.present_days, 0) + COALESCE(attendance_summary.late_days, 0) + COALESCE(leave_summary.total_leave_days, 0) +
                  COALESCE(off_days_summary.total_off_days, 0) + COALESCE(${total_general_holidays}, 0) + COALESCE(${total_special_holidays}, 0) + COALESCE(
                    (
                      (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date 
                      - (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD'))::date
                      + 1
                    ), 0
                    )
                    - (
                    COALESCE(attendance_summary.present_days, 0) + 
                    COALESCE(attendance_summary.late_days, 0) + 
                    COALESCE(leave_summary.total_leave_days, 0) + 
                    COALESCE(${total_general_holidays}::int, 0) + 
                    COALESCE(${total_special_holidays}::int, 0)
                    )
                , 0)::float8 AS total_days_gg,
                ${totalDays}::int AS total_days,
                COALESCE(COALESCE(
                  employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0),
                  employee.joining_amount
                ) / ${totalDays}, 0)::float8 AS daily_salary,
                COALESCE(
                  (COALESCE(employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0), employee.joining_amount) / ${totalDays}) *
                  (
                    COALESCE(attendance_summary.present_days, 0)
                    + COALESCE(off_days_summary.total_off_days, 0)
                    + COALESCE(leave_summary.total_leave_days, 0)
                    + COALESCE(${total_general_holidays}, 0)
                    + COALESCE(${total_special_holidays}, 0)
                  )
                , 0)::float8 AS gross_salary,
                COALESCE(salary_entry_summary.advance_amount, 0)::float8 AS advance_amount,
                COALESCE(salary_entry_summary.loan_amount, 0)::float8 AS loan_amount,
                COALESCE(
                  salary_entry_summary.advance_amount + salary_entry_summary.loan_amount, 0
                )::float8 AS total_advance_salary,
                COALESCE(
                    FLOOR(COALESCE(attendance_summary.late_days, 0) / 3) * 
                    (COALESCE(
                      employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0),
                      employee.joining_amount
                    ) / ${totalDays})
                  , 0)::float8 AS late_salary_deduction,
                (
                  COALESCE(salary_entry_summary.advance_amount, 0)
                  + COALESCE(salary_entry_summary.loan_amount, 0)
                  + COALESCE(
                    COALESCE(employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0), employee.joining_amount)
                    / ${totalDays} * (COALESCE(attendance_summary.late_days, 0)), 0
                  )
                )::float8 AS total_deduction,
                (
                  COALESCE(
                    (COALESCE(employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0), employee.joining_amount) / ${totalDays}) *
                    (
                      COALESCE(attendance_summary.present_days, 0)
                      + COALESCE(off_days_summary.total_off_days, 0)
                      + COALESCE(leave_summary.total_leave_days, 0)
                      + COALESCE(${total_general_holidays}, 0)
                      + COALESCE(${total_special_holidays}, 0)
                    )
                  , 0)
                  -
                  (
                    COALESCE(salary_entry_summary.advance_amount, 0)
                    + COALESCE(salary_entry_summary.loan_amount, 0)
                    + COALESCE(
                      FLOOR(COALESCE(attendance_summary.late_days, 0) / 3) *
                      (COALESCE(
                        employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0),
                        employee.joining_amount
                      ) / ${totalDays})
                    , 0)
                  )
                )::float8 AS net_payable
            FROM  hr.employee
            LEFT JOIN hr.users employeeUser
              ON employee.user_uuid = employeeUser.uuid
            LEFT JOIN hr.users createdByUser
              ON employee.created_by = createdByUser.uuid
            LEFT JOIN (
              SELECT 
                si.employee_uuid, 
                SUM(si.amount) AS total_salary_increment 
              FROM hr.salary_increment si
            WHERE EXTRACT(YEAR FROM si.effective_date) <= ${year}
              AND EXTRACT(MONTH FROM si.effective_date) <= ${month}
              GROUP BY si.employee_uuid
            ) AS total_increment
              ON employee.uuid = total_increment.employee_uuid
            LEFT JOIN (
              SELECT 
                pl.employee_uuid,
                COUNT(CASE WHEN pl.punch_time IS NOT NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') < TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS present_days,
                COUNT(CASE WHEN pl.punch_time IS NULL AND TO_CHAR(pl.punch_time, 'HH24:MI') >= TO_CHAR(shifts.late_time, 'HH24:MI') THEN 1 END) AS late_days
              FROM hr.punch_log pl
              LEFT JOIN hr.employee e ON pl.employee_uuid = e.uuid
              LEFT JOIN hr.shift_group ON e.shift_group_uuid = shift_group.uuid
              LEFT JOIN hr.shifts ON shift_group.shifts_uuid = shifts.uuid
              WHERE pl.punch_time IS NOT NULL
                AND EXTRACT(YEAR FROM pl.punch_time) = ${year}
                AND EXTRACT(MONTH FROM pl.punch_time) = ${month}
              GROUP BY pl.employee_uuid
              ) AS attendance_summary
              ON employee.uuid = attendance_summary.employee_uuid
            LEFT JOIN (
              SELECT
                  al.employee_uuid,
                  SUM(al.to_date::date - al.from_date::date + 1) -
                  SUM(
                    CASE
                      WHEN al.to_date::date > (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date
                        THEN al.to_date::date - (TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date
                      ELSE 0
                    END
                    +
                    CASE
                      WHEN al.from_date::date < TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD')::date
                        THEN TO_TIMESTAMP(CAST(${year} AS TEXT) || '-' || LPAD(CAST(${month} AS TEXT), 2, '0') || '-01', 'YYYY-MM-DD')::date - al.from_date::date
                      ELSE 0
                    END
                  ) AS total_leave_days
                FROM hr.apply_leave al
                WHERE al.approval = 'approved'
                AND (
                  EXTRACT(YEAR FROM al.to_date) > ${year}
                  OR (EXTRACT(YEAR FROM al.to_date) = ${year} AND EXTRACT(MONTH FROM al.to_date) >= ${month})
                )
                AND (
                  EXTRACT(YEAR FROM al.from_date) < ${year}
                  OR (EXTRACT(YEAR FROM al.from_date) = ${year} AND EXTRACT(MONTH FROM al.from_date) <= ${month})
                )
                GROUP BY al.employee_uuid
            ) AS leave_summary
              ON employee.uuid = leave_summary.employee_uuid
            LEFT JOIN (
                  WITH params AS (
                        SELECT 
                          ${year}::int AS y, 
                          ${month}::int AS m,
                          make_date(${year}::int, ${month}::int, 1) AS month_start,
                          (make_date(${year}::int, ${month}::int, 1) + INTERVAL '1 month - 1 day')::date AS month_end
                      ),
                      shift_group_periods AS (
                        SELECT
                          sg.uuid AS shift_group_uuid,
                          sg.effective_date,
                          sg.off_days::jsonb
                        FROM hr.shift_group sg
                      ),
                      latest_roster AS (
                        SELECT DISTINCT ON (shift_group_uuid)
                          shift_group_uuid,
                          effective_date,
                          off_days::jsonb
                        FROM hr.roster
                        WHERE effective_date <= (SELECT month_end FROM params)
                        ORDER BY shift_group_uuid, effective_date DESC
                      ),
                      second_latest_roster AS (
                        SELECT DISTINCT ON (shift_group_uuid)
                          shift_group_uuid,
                          effective_date,
                          off_days::jsonb
                        FROM (
                          SELECT
                            shift_group_uuid,
                            effective_date,
                            off_days::jsonb,
                            ROW_NUMBER() OVER (PARTITION BY shift_group_uuid ORDER BY effective_date DESC) AS rn
                          FROM hr.roster
                          WHERE effective_date <= (SELECT month_end FROM params)
                        ) t
                        WHERE t.rn = 2
                      ),
                      all_days AS (
                        SELECT
                          sgp.shift_group_uuid,
                          d::date AS day,
                          CASE
                            WHEN lr.effective_date IS NULL OR d < lr.effective_date THEN slr.off_days
                            ELSE sgp.off_days
                          END AS off_days
                        FROM shift_group_periods sgp
                        LEFT JOIN latest_roster lr ON sgp.shift_group_uuid = lr.shift_group_uuid
                        LEFT JOIN second_latest_roster slr ON sgp.shift_group_uuid = slr.shift_group_uuid
                        CROSS JOIN LATERAL generate_series((SELECT month_start FROM params), (SELECT month_end FROM params), INTERVAL '1 day') AS d
                      )
                      SELECT
                        shift_group_uuid,
                        COUNT(*) AS total_off_days
                      FROM all_days
                      WHERE lower(to_char(day, 'Dy')) = ANY (
                        SELECT jsonb_array_elements_text(off_days)
                      )
                      GROUP BY shift_group_uuid
            ) AS off_days_summary
              ON employee.shift_group_uuid = off_days_summary.shift_group_uuid
            LEFT JOIN
              (
                SELECT 
                  se.advance_amount::float8,
                  se.loan_amount::float8,
                  se.uuid AS salary_entry_uuid,
                  se.employee_uuid AS salary_entry_employee_uuid
                FROM hr.salary_entry se
                WHERE se.month = ${prevMonth}
                  AND se.year = ${prevYear}
              ) AS salary_entry_summary
            ON employee.uuid = salary_entry_summary.salary_entry_employee_uuid
            WHERE employee.status = true 
            ${employee_uuid ? sql`AND employee.uuid = ${employee_uuid}` : sql``}
            ORDER BY employee.created_at DESC`;

  const resultPromise = db.execute(query);

  const data = await resultPromise;

  if (employee_uuid)
    return c.json(data.rows[0] || {}, HSCode.OK);
  else
    return c.json(data.rows || [], HSCode.OK);
};
