import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { department, designation, employee, leave_policy, leave_policy_log, users } from '../schema';

const employeeUser = alias(users, 'employeeUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(leave_policy_log).values(value).returning({
    name: leave_policy_log.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(leave_policy_log)
    .set(updates)
    .where(eq(leave_policy_log.uuid, uuid))
    .returning({
      name: leave_policy_log.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(leave_policy_log)
    .where(eq(leave_policy_log.uuid, uuid))
    .returning({
      name: leave_policy_log.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { year } = c.req.valid('query');

  const leave_policy_logPromise = db
    .select({
      uuid: leave_policy_log.uuid,
      employee_uuid: leave_policy_log.employee_uuid,
      employee_name: employeeUser.name,
      employee_department_name: department.department,
      employee_designation_name: designation.designation,
      leave_policy_uuid: leave_policy_log.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      year: leave_policy_log.year,
      sick_used: PG_DECIMAL_TO_FLOAT(leave_policy_log.sick_used),
      casual_used: PG_DECIMAL_TO_FLOAT(leave_policy_log.casual_used),
      maternity_used: PG_DECIMAL_TO_FLOAT(leave_policy_log.maternity_used),
      sick_added: PG_DECIMAL_TO_FLOAT(leave_policy_log.sick_added),
      casual_added: PG_DECIMAL_TO_FLOAT(leave_policy_log.casual_added),
      maternity_added: PG_DECIMAL_TO_FLOAT(leave_policy_log.maternity_added),
      sick_leave: sql`COALESCE((
                            SELECT 
                              conf_entry.maximum_number_of_allowed_leaves::float
                            FROM hr.configuration_entry conf_entry
                            LEFT JOIN hr.leave_category lc ON conf_entry.leave_category_uuid = lc.uuid
                            LEFT JOIN hr.configuration conf ON conf_entry.configuration_uuid = conf.uuid
                            LEFT JOIN hr.leave_policy lp ON conf.leave_policy_uuid = lp.uuid
                            WHERE lc.name = 'Sick Leave' AND lp.uuid = ${leave_policy_log.leave_policy_uuid}
                       ), 0)`,

      casual_leave: sql`COALESCE((
                            SELECT 
                              conf_entry.maximum_number_of_allowed_leaves::float
                            FROM hr.configuration_entry conf_entry
                            LEFT JOIN hr.leave_category lc ON conf_entry.leave_category_uuid = lc.uuid
                            LEFT JOIN hr.configuration conf ON conf_entry.configuration_uuid = conf.uuid
                            LEFT JOIN hr.leave_policy lp ON conf.leave_policy_uuid = lp.uuid
                            WHERE lc.name = 'Casual Leave' AND lp.uuid = ${leave_policy_log.leave_policy_uuid}
                       ), 0)`,

      maternity_leave: sql`COALESCE((
                            SELECT 
                              conf_entry.maximum_number_of_allowed_leaves::float
                            FROM hr.configuration_entry conf_entry
                            LEFT JOIN hr.leave_category lc ON conf_entry.leave_category_uuid = lc.uuid
                            LEFT JOIN hr.configuration conf ON conf_entry.configuration_uuid = conf.uuid
                            LEFT JOIN hr.leave_policy lp ON conf.leave_policy_uuid = lp.uuid
                            WHERE lc.name = 'Maternity Leave' AND lp.uuid = ${leave_policy_log.leave_policy_uuid}
                       ), 0)`,
      created_by: leave_policy_log.created_by,
      created_by_name: users.name,
      created_at: leave_policy_log.created_at,
      updated_at: leave_policy_log.updated_at,
      remarks: leave_policy_log.remarks,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
    })
    .from(leave_policy_log)
    .leftJoin(users, eq(leave_policy_log.created_by, users.uuid))
    .leftJoin(employee, eq(leave_policy_log.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employeeUser.department_uuid, department.uuid))
    .leftJoin(designation, eq(employeeUser.designation_uuid, designation.uuid))
    .leftJoin(leave_policy, eq(leave_policy_log.leave_policy_uuid, leave_policy.uuid))
    .orderBy(desc(leave_policy_log.created_at));

  if (year !== undefined) {
    leave_policy_logPromise.where(
      eq(leave_policy_log.year, year),
    );
  }

  const data = await leave_policy_logPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const leave_policy_logPromise = db
    .select({
      uuid: leave_policy_log.uuid,
      employee_uuid: leave_policy_log.employee_uuid,
      employee_name: employeeUser.name,
      employee_department_name: department.department,
      employee_designation_name: designation.designation,
      leave_policy_uuid: leave_policy_log.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      year: leave_policy_log.year,
      sick_used: PG_DECIMAL_TO_FLOAT(leave_policy_log.sick_used),
      casual_used: PG_DECIMAL_TO_FLOAT(leave_policy_log.casual_used),
      maternity_used: PG_DECIMAL_TO_FLOAT(leave_policy_log.maternity_used),
      sick_added: PG_DECIMAL_TO_FLOAT(leave_policy_log.sick_added),
      casual_added: PG_DECIMAL_TO_FLOAT(leave_policy_log.casual_added),
      maternity_added: PG_DECIMAL_TO_FLOAT(leave_policy_log.maternity_added),
      sick_leave: sql`COALESCE((
                            SELECT 
                              conf_entry.maximum_number_of_allowed_leaves::float
                            FROM hr.configuration_entry conf_entry
                            LEFT JOIN hr.leave_category lc ON conf_entry.leave_category_uuid = lc.uuid
                            LEFT JOIN hr.configuration conf ON conf_entry.configuration_uuid = conf.uuid
                            LEFT JOIN hr.leave_policy lp ON conf.leave_policy_uuid = lp.uuid
                            WHERE lc.name = 'Sick Leave' AND lp.uuid = ${leave_policy_log.leave_policy_uuid}
                       ), 0)`,
      casual_leave: sql`COALESCE((
                            SELECT 
                              conf_entry.maximum_number_of_allowed_leaves::float
                            FROM hr.configuration_entry conf_entry
                            LEFT JOIN hr.leave_category lc ON conf_entry.leave_category_uuid = lc.uuid
                            LEFT JOIN hr.configuration conf ON conf_entry.configuration_uuid = conf.uuid
                            LEFT JOIN hr.leave_policy lp ON conf.leave_policy_uuid = lp.uuid
                            WHERE lc.name = 'Casual Leave' AND lp.uuid = ${leave_policy_log.leave_policy_uuid}
                       ), 0)`,
      maternity_leave: sql`COALESCE((
                            SELECT 
                              conf_entry.maximum_number_of_allowed_leaves::float
                            FROM hr.configuration_entry conf_entry
                            LEFT JOIN hr.leave_category lc ON conf_entry.leave_category_uuid = lc.uuid
                            LEFT JOIN hr.configuration conf ON conf_entry.configuration_uuid = conf.uuid
                            LEFT JOIN hr.leave_policy lp ON conf.leave_policy_uuid = lp.uuid
                            WHERE lc.name = 'Maternity Leave' AND lp.uuid = ${leave_policy_log.leave_policy_uuid}
                       ), 0)`,
      created_by: leave_policy_log.created_by,
      created_by_name: users.name,
      created_at: leave_policy_log.created_at,
      updated_at: leave_policy_log.updated_at,
      remarks: leave_policy_log.remarks,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
    })
    .from(leave_policy_log)
    .leftJoin(users, eq(leave_policy_log.created_by, users.uuid))
    .leftJoin(employee, eq(leave_policy_log.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employeeUser.department_uuid, department.uuid))
    .leftJoin(designation, eq(employeeUser.designation_uuid, designation.uuid))
    .leftJoin(leave_policy, eq(leave_policy_log.leave_policy_uuid, leave_policy.uuid))
    .where(eq(leave_policy_log.uuid, uuid));

  const [data] = await leave_policy_logPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
