import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { department, designation, employee, employee_log, leave_policy, shift_group, shifts, users } from '../schema';

const employeeUser = alias(users, 'employeeUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employee_log).values(value).returning({
    name: employee_log.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee_log)
    .set(updates)
    .where(eq(employee_log.uuid, uuid))
    .returning({
      name: employee_log.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(employee_log)
    .where(eq(employee_log.uuid, uuid))
    .returning({
      name: employee_log.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { type } = c.req.valid('query');

  const employee_logPromise = db
    .select({
      id: employee_log.id,
      uuid: employee_log.uuid,
      employee_uuid: employee_log.employee_uuid,
      employee_name: employeeUser.name,
      employee_department_name: department.department,
      employee_designation_name: designation.designation,
      type: employee_log.type,
      type_uuid: employee_log.type_uuid,
      type_name: sql<string>`COALESCE(${leave_policy.name}, ${shift_group.name})`,
      shift_name: shifts.name,
      effective_date: employee_log.effective_date,
      created_by: employee_log.created_by,
      created_by_name: users.name,
      created_at: employee_log.created_at,
      updated_at: employee_log.updated_at,
      remarks: employee_log.remarks,
    })
    .from(employee_log)
    .leftJoin(users, eq(employee_log.created_by, users.uuid))
    .leftJoin(employee, eq(employee_log.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employeeUser.department_uuid, department.uuid))
    .leftJoin(designation, eq(employeeUser.designation_uuid, designation.uuid))
    .leftJoin(leave_policy, eq(employee_log.type_uuid, leave_policy.uuid))
    .leftJoin(shift_group, eq(employee_log.type_uuid, shift_group.uuid))
    .leftJoin(shifts, eq(shift_group.shifts_uuid, shifts.uuid))
    // .where(eq(employee_log.employee_uuid, 'EMP00000000001'))
    .orderBy(desc(employee_log.created_at));

  if (type) {
    employee_logPromise.where(
      eq(employee_log.type, type),
    );
  }

  const data = await employee_logPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employee_logPromise = db
    .select({
      id: employee_log.id,
      uuid: employee_log.uuid,
      employee_uuid: employee_log.employee_uuid,
      employee_name: employeeUser.name,
      employee_department_name: department.department,
      employee_designation_name: designation.designation,
      type: employee_log.type,
      type_uuid: employee_log.type_uuid,
      type_name: sql<string>`COALESCE(${leave_policy.name}, ${shift_group.name})`,
      current_shift_group_uuid: sql<string>`(
        SELECT
          el.type_uuid
        FROM
          ${employee_log} AS el
        WHERE
          el.employee_uuid = ${employee_log.employee_uuid}
          AND el.type = 'shift_group' AND el.effective_date <= CURRENT_DATE
        ORDER BY
          el.effective_date DESC
        LIMIT 1
      )`,
      current_shift_group_name: sql<string>`(
        SELECT
          sg.name
        FROM  ${employee_log} AS el
        LEFT JOIN ${shift_group} AS sg ON el.type_uuid = sg.uuid
        WHERE
          el.employee_uuid = ${employee_log.employee_uuid}
          AND el.type = 'shift_group' AND el.effective_date <= CURRENT_DATE
        ORDER BY
          el.effective_date DESC
        LIMIT 1
      )`,
      current_shift_start_time: sql<string>`(
        SELECT
          s.start_time
        FROM  ${employee_log} AS el
        LEFT JOIN ${shift_group} AS sg ON el.type_uuid = sg.uuid
        LEFT JOIN ${shifts} AS s ON sg.shifts_uuid = s.uuid
        WHERE
          el.employee_uuid = ${employee_log.employee_uuid}
          AND el.type = 'shift_group' AND el.effective_date <= CURRENT_DATE
        ORDER BY
          el.effective_date DESC
        LIMIT 1
      )`,
      current_shift_end_time: sql<string>`(
        SELECT
          s.end_time
        FROM  ${employee_log} AS el
        LEFT JOIN ${shift_group} AS sg ON el.type_uuid = sg.uuid
        LEFT JOIN ${shifts} AS s ON sg.shifts_uuid = s.uuid
        WHERE
          el.employee_uuid = ${employee_log.employee_uuid}
          AND el.type = 'shift_group' AND el.effective_date <= CURRENT_DATE
        ORDER BY
          el.effective_date DESC
        LIMIT 1
      )`,
      current_leave_policy_uuid: sql<string>`(
        SELECT
          el.type_uuid
        FROM
          ${employee_log} AS el
        WHERE
          el.employee_uuid = ${employee_log.employee_uuid}
          AND el.type = 'leave_policy' AND el.effective_date <= CURRENT_DATE
        ORDER BY
          el.effective_date DESC
        LIMIT 1
      )`,
      current_leave_policy_name: sql<string>`(
        SELECT
          lp.name
        FROM  ${employee_log} AS el
        LEFT JOIN ${leave_policy} AS lp ON el.type_uuid = lp.uuid
        WHERE
          el.employee_uuid = ${employee_log.employee_uuid}
          AND el.type = 'leave_policy' AND el.effective_date <= CURRENT_DATE
        ORDER BY
          el.effective_date DESC
        LIMIT 1
      )`,
      effective_date: employee_log.effective_date,
      created_by: employee_log.created_by,
      created_by_name: users.name,
      created_at: employee_log.created_at,
      updated_at: employee_log.updated_at,
      remarks: employee_log.remarks,
    })
    .from(employee_log)
    .leftJoin(users, eq(employee_log.created_by, users.uuid))
    .leftJoin(employee, eq(employee_log.employee_uuid, employee.uuid))
    .leftJoin(employeeUser, eq(employee.user_uuid, employeeUser.uuid))
    .leftJoin(department, eq(employeeUser.department_uuid, department.uuid))
    .leftJoin(designation, eq(employeeUser.designation_uuid, designation.uuid))
    .leftJoin(leave_policy, eq(employee_log.type_uuid, leave_policy.uuid))
    .leftJoin(shift_group, eq(employee_log.type_uuid, shift_group.uuid))
    // .where(eq(employee_log.employee_uuid, 'EMP00000000001'))
    // .orderBy(desc(employee_log.created_at))
    .where(eq(employee_log.uuid, uuid));

  const [data] = await employee_logPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
