import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetEmployeeSalaryDetailsByYearDateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { department, designation, employee, salary_entry, users } from '../schema';

const createdByUser = alias(users, 'createdByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  // Support single object or array of objects
  const values = Array.isArray(value) ? value : [value];

  if (values.length === 0) {
    return c.json(createToast('error', 'No data provided'), HSCode.BAD_REQUEST);
  }

  const data = await db.insert(salary_entry).values(values).returning({
    name: salary_entry.uuid,
  });

  // Return array of created UUIDs for bulk, or single for single
  const names = data.map(d => d.name);
  return c.json(
    createToast(
      'create',
      values.length === 1 ? names[0] : names.join(', '),
    ),
    HSCode.OK,
  );
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
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: users.department_uuid,
      department_name: department.department,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
      tds: PG_DECIMAL_TO_FLOAT(salary_entry.tds),
    })
    .from(salary_entry)
    .leftJoin(
      createdByUser,
      eq(salary_entry.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(salary_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
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
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: users.department_uuid,
      department_name: department.department,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
      tds: PG_DECIMAL_TO_FLOAT(salary_entry.tds),
    })
    .from(salary_entry)
    .leftJoin(
      createdByUser,
      eq(salary_entry.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(salary_entry.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .where(eq(salary_entry.uuid, uuid));

  const [data] = await salaryIncrementPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getEmployeeSalaryDetailsByYearDate: AppRouteHandler<GetEmployeeSalaryDetailsByYearDateRoute> = async (c: any) => {
  const { year, month } = c.req.valid('param');

  const { employee_uuid } = c.req.valid('query');

  const now = new Date();
  let to_date: Date;

  const yearNum = Number(year);
  const monthNum = Number(month);
  const from_date = new Date(Date.UTC(yearNum, monthNum - 1, 1));

  if (monthNum - 1 === now.getUTCMonth() && yearNum === now.getUTCFullYear()) {
    to_date = new Date(Date.UTC(yearNum, monthNum - 1, now.getUTCDate()));
  }
  else {
    to_date = new Date(Date.UTC(yearNum, monthNum, 0));
  }

  const query = sql`
            SELECT 
                employee.uuid as employee_uuid,
                employee.user_uuid as employee_user_uuid,
                employee.joining_amount::float8,
                employee.created_at,
                employee.updated_at,
                employee.remarks,
                emp_sum.employee_name,
                emp_sum.designation,
                emp_sum.department,
                emp_sum.start_date,
                emp_sum.profile_picture,
                emp_sum.email,
                COALESCE(total_increment.total_salary_increment, 0)::float8 AS total_incremented_salary,
                COALESCE(attendance_summary.present_days, 0)::float8 AS present_days,
                COALESCE(attendance_summary.late_days, 0)::float8 AS late_days,
                hr.get_total_leave_days(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date) AS total_leave_days,
                (employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0))::float8 AS total_salary,
                hr.get_offday_count(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date) AS week_days,
                hr.get_general_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date) AS total_general_holidays,
                hr.get_special_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date) AS total_special_holidays,
                COALESCE(
                  hr.get_offday_count(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                  + hr.get_general_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                  + hr.get_special_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date),
                  0
                )::float8 AS total_off_days_including_holidays,
                COALESCE(
                  attendance_summary.present_days + attendance_summary.late_days + hr.get_total_leave_days(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date),
                  0
                )::float8 AS total_present_days,
                
               (
                 ( (${to_date}::date - GREATEST(${from_date}::date, employee.start_date::date)) + 1 )::int
               ) -
                    (
                      COALESCE(attendance_summary.present_days, 0) + 
                      COALESCE(attendance_summary.late_days, 0) + 
                      hr.get_total_leave_days(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)+ 
                      hr.get_general_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)+
                      hr.get_special_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)+
                      hr.get_offday_count(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                    )::float8 AS absent_days,
               ( (${to_date}::date - GREATEST(${from_date}::date, employee.start_date::date)) + 1 )::int AS total_days,
               COALESCE((employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0)) / 30, 0)::float8 AS daily_salary,
               COALESCE(
                        (
                          (employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0)) / 30
                          *
                          (
                            COALESCE(attendance_summary.present_days, 0)
                            + hr.get_offday_count(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                            + hr.get_total_leave_days(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                            + hr.get_general_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                            + hr.get_special_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                          )
                        ),
                        0
                )::float8 AS gross_salary,
                COALESCE(
                    FLOOR(COALESCE(attendance_summary.late_days, 0) / employee.late_day_unit) * 
                    (employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0)) / 30
                  , 0)::float8 AS late_salary_deduction,
                (
                  COALESCE(
                    (COALESCE(employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0), employee.joining_amount) / 30) *
                    (
                      COALESCE(attendance_summary.present_days, 0)
                      + hr.get_offday_count(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                      + hr.get_total_leave_days(employee.uuid, GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                      + hr.get_general_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                      + hr.get_special_holidays_count(GREATEST(${from_date}::date, employee.start_date::date), ${to_date}::date)
                    )
                  , 0)
                  -
                  COALESCE(
                    FLOOR(COALESCE(attendance_summary.late_days, 0) / employee.late_day_unit) *
                    (COALESCE(employee.joining_amount + COALESCE(total_increment.total_salary_increment, 0), employee.joining_amount) / 30)
                  , 0) 
                )::float8 AS net_payable,
                COALESCE(loan_summary.total_loan_salary_amount, 0)::float8 AS total_loan_salary_amount,
                COALESCE(loan_entry_summary.total_paid_loan_salary_amount, 0)::float8 AS total_paid_loan_salary_amount,
                (COALESCE(loan_summary.total_loan_salary_amount, 0) - COALESCE(loan_entry_summary.total_paid_loan_salary_amount, 0))::float8 AS due_loan_salary_amount,
                employee.tax_amount::float8,
                COALESCE(total_new_tds.new_tds, 0)::float8 AS new_tds
            FROM  hr.employee
            LEFT JOIN LATERAL
                    hr.get_employee_summary(employee.uuid) emp_sum ON TRUE
            LEFT JOIN (
              SELECT 
                si.employee_uuid, 
                SUM(si.amount) AS total_salary_increment,
                SUM(si.new_tds) AS total_new_tds
              FROM hr.salary_increment si
            WHERE si.effective_date::date <= ${to_date}::date
              GROUP BY si.employee_uuid
            ) AS total_increment
              ON employee.uuid = total_increment.employee_uuid
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
                                      AND  hr.is_employee_on_leave(da.employee_uuid, da.attendance_date)=false
                                      AND ((da.first_punch::time < da.late_time::time) OR (hr.is_employee_applied_late(da.employee_uuid, da.attendance_date) = true))
                                    THEN 1 ELSE NULL
                                  END
                                ) AS present_days,
                            COUNT(
                                CASE 
                                    WHEN (SELECT is_general_holiday FROM hr.is_general_holiday(da.attendance_date)) IS false
                                        AND  (SELECT is_special_holiday FROM hr.is_special_holiday(da.attendance_date)) IS false
                                        AND  hr.is_employee_off_day(da.employee_uuid,da.attendance_date)=false
                                        AND  hr.is_employee_on_leave(da.employee_uuid, da.attendance_date)=false
                                        AND  hr.is_employee_applied_late(da.employee_uuid, da.attendance_date)=false
                                        AND  da.first_punch::time >= da.late_time::time THEN 1
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
                    ) AS attendance_summary ON employee.uuid = attendance_summary.employee_uuid
            LEFT JOIN 
                (
                  SELECT 
                    l.employee_uuid,
                    SUM(l.amount) AS total_loan_salary_amount
                  FROM hr.loan l
                  WHERE l.date::date <= ${to_date}::date
                  GROUP BY employee_uuid
                ) AS loan_summary
            ON employee.uuid = loan_summary.employee_uuid
            LEFT JOIN
              (
                SELECT 
                  l.employee_uuid,
                  SUM(le.amount) as total_paid_loan_salary_amount
                FROM hr.loan_entry le
                LEFT JOIN hr.loan l ON le.loan_uuid = l.uuid
                WHERE le.date::date <= ${to_date}::date
                GROUP BY l.employee_uuid
              ) AS loan_entry_summary
            ON employee.uuid = loan_entry_summary.employee_uuid
            LEFT JOIN 
                    (
                      SELECT
                           si.employee_uuid,
                           si.new_tds::float8
                      FROM hr.salary_increment si
                      WHERE effective_date::date <= ${to_date}::date
                      ORDER BY si.effective_date DESC
                      LIMIT 1
                    ) AS total_new_tds
              ON employee.uuid = total_new_tds.employee_uuid
            WHERE employee.status = true AND employee.start_date <= ${to_date}::date
            ${employee_uuid ? sql`AND employee.uuid = ${employee_uuid}` : sql``}
            ORDER BY employee.created_at DESC`;

  const resultPromise = db.execute(query);

  const data = await resultPromise;

  if (employee_uuid)
    return c.json(data.rows[0] || {}, HSCode.OK);
  else
    return c.json(data.rows || [], HSCode.OK);
};
