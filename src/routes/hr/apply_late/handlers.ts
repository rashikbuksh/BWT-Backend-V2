import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
// import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
// import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { apply_late, department, designation, employee, users } from '../schema';

const createdByUser = alias(users, 'createdByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(apply_late).values(value).returning({
    name: apply_late.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(apply_late)
    .set(updates)
    .where(eq(apply_late.uuid, uuid))
    .returning({
      name: apply_late.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(apply_late)
    .where(eq(apply_late.uuid, uuid))
    .returning({
      name: apply_late.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { status, employee_uuid } = c.req.valid('query');

  const applyLatePromise = db
    .select({
      uuid: apply_late.uuid,
      employee_uuid: apply_late.employee_uuid,
      employee_name: users.name,
      employee_department_name: department.department,
      employee_designation_name: designation.designation,
      date: apply_late.date,
      reason: apply_late.reason,
      status: apply_late.status,
      created_by: apply_late.created_by,
      created_by_name: createdByUser.name,
      created_at: apply_late.created_at,
      updated_at: apply_late.updated_at,
      remarks: apply_late.remarks,
      profile_picture: employee.profile_picture,
      start_Date: employee.start_date,
    })
    .from(apply_late)
    .leftJoin(
      createdByUser,
      eq(apply_late.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(apply_late.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .orderBy(desc(apply_late.created_at));

  const filters = [];

  if (employee_uuid) {
    filters.push(eq(apply_late.employee_uuid, employee_uuid));
  }

  if (status) {
    filters.push(eq(apply_late.status, status));
  }

  if (filters.length > 0) {
    applyLatePromise.where(and(...filters));
  }

  const data = await applyLatePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const applyLatePromise = db
    .select({
      uuid: apply_late.uuid,
      employee_uuid: apply_late.employee_uuid,
      employee_name: users.name,
      employee_department_name: department.department,
      employee_designation_name: designation.designation,
      date: apply_late.date,
      reason: apply_late.reason,
      status: apply_late.status,
      created_by: apply_late.created_by,
      created_by_name: createdByUser.name,
      created_at: apply_late.created_at,
      updated_at: apply_late.updated_at,
      remarks: apply_late.remarks,
      profile_picture: employee.profile_picture,
      start_Date: employee.start_date,
    })
    .from(apply_late)
    .leftJoin(
      createdByUser,
      eq(apply_late.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(apply_late.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(employee.department_uuid, department.uuid))
    .leftJoin(designation, eq(employee.designation_uuid, designation.uuid))
    .where(eq(apply_late.uuid, uuid));

  const [data] = await applyLatePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
