import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByEmployeeUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, employee_history, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');
export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employee_history).values(value).returning({
    name: employee_history.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee_history)
    .set(updates)
    .where(eq(employee_history.uuid, uuid))
    .returning({
      name: employee_history.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(employee_history)
    .where(eq(employee_history.uuid, uuid))
    .returning({
      name: employee_history.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employeeHistoryPromise = db
    .select({
      uuid: employee_history.uuid,
      index: employee_history.index,
      employee_uuid: employee_history.employee_uuid,
      employee_name: users.name,
      company_name: employee_history.company_name,
      company_business: employee_history.company_business,
      start_date: employee_history.start_date,
      end_date: employee_history.end_date,
      department: employee_history.department,
      designation: employee_history.designation,
      location: employee_history.location,
      responsibilities: employee_history.responsibilities,
      created_by: employee_history.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_history.created_at,
      updated_at: employee_history.updated_at,
      remarks: employee_history.remarks,
    })
    .from(employee_history)
    .leftJoin(employee, eq(employee_history.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_history.created_by, createdByUser.uuid),
    )
    .orderBy(desc(employee_history.created_at));

  const data = await employeeHistoryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employeeHistoryPromise = db
    .select({
      uuid: employee_history.uuid,
      index: employee_history.index,
      employee_uuid: employee_history.employee_uuid,
      employee_name: users.name,
      company_name: employee_history.company_name,
      company_business: employee_history.company_business,
      start_date: employee_history.start_date,
      end_date: employee_history.end_date,
      department: employee_history.department,
      designation: employee_history.designation,
      location: employee_history.location,
      responsibilities: employee_history.responsibilities,
      created_by: employee_history.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_history.created_at,
      updated_at: employee_history.updated_at,
      remarks: employee_history.remarks,
    })
    .from(employee_history)
    .leftJoin(employee, eq(employee_history.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_history.created_by, createdByUser.uuid),
    )
    .where(eq(employee_history.uuid, uuid));

  const [data] = await employeeHistoryPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByEmployeeUuid: AppRouteHandler<GetByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const employeeHistoryPromise = db
    .select({
      uuid: employee_history.uuid,
      index: employee_history.index,
      employee_uuid: employee_history.employee_uuid,
      employee_name: users.name,
      company_name: employee_history.company_name,
      company_business: employee_history.company_business,
      start_date: employee_history.start_date,
      end_date: employee_history.end_date,
      department: employee_history.department,
      designation: employee_history.designation,
      location: employee_history.location,
      responsibilities: employee_history.responsibilities,
      created_by: employee_history.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_history.created_at,
      updated_at: employee_history.updated_at,
      remarks: employee_history.remarks,
    })
    .from(employee_history)
    .leftJoin(employee, eq(employee_history.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_history.created_by, createdByUser.uuid),
    )
    .where(eq(employee_history.employee_uuid, employee_uuid));

  const data = await employeeHistoryPromise;

  return c.json(data || [], HSCode.OK);
};
