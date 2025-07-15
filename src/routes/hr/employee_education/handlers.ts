import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByEmployeeUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, employee_education, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');
export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employee_education).values(value).returning({
    name: employee_education.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee_education)
    .set(updates)
    .where(eq(employee_education.uuid, uuid))
    .returning({
      name: employee_education.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(employee_education)
    .where(eq(employee_education.uuid, uuid))
    .returning({
      name: employee_education.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employeeEducationPromise = db
    .select({
      uuid: employee_education.uuid,
      index: employee_education.index,
      employee_uuid: employee_education.employee_uuid,
      employee_name: users.name,
      degree_name: employee_education.degree_name,
      institute: employee_education.institute,
      board: employee_education.board,
      year_of_passing: employee_education.year_of_passing,
      grade: employee_education.grade,
      created_by: employee_education.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_education.created_at,
      updated_at: employee_education.updated_at,
      remarks: employee_education.remarks,
    })
    .from(employee_education)
    .leftJoin(employee, eq(employee_education.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_education.created_by, createdByUser.uuid),
    )
    .orderBy(desc(employee_education.created_at));

  const data = await employeeEducationPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employeeEducationPromise = db
    .select({
      uuid: employee_education.uuid,
      index: employee_education.index,
      employee_uuid: employee_education.employee_uuid,
      employee_name: users.name,
      degree_name: employee_education.degree_name,
      institute: employee_education.institute,
      board: employee_education.board,
      year_of_passing: employee_education.year_of_passing,
      grade: employee_education.grade,
      created_by: employee_education.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_education.created_at,
      updated_at: employee_education.updated_at,
      remarks: employee_education.remarks,
    })
    .from(employee_education)
    .leftJoin(employee, eq(employee_education.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_education.created_by, createdByUser.uuid),
    )
    .where(eq(employee_education.uuid, uuid));

  const [data] = await employeeEducationPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByEmployeeUuid: AppRouteHandler<GetByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const employeeEducationPromise = db
    .select({
      uuid: employee_education.uuid,
      index: employee_education.index,
      employee_uuid: employee_education.employee_uuid,
      employee_name: users.name,
      degree_name: employee_education.degree_name,
      institute: employee_education.institute,
      board: employee_education.board,
      year_of_passing: employee_education.year_of_passing,
      grade: employee_education.grade,
      created_by: employee_education.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_education.created_at,
      updated_at: employee_education.updated_at,
      remarks: employee_education.remarks,
    })
    .from(employee_education)
    .leftJoin(employee, eq(employee_education.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_education.created_by, createdByUser.uuid),
    )
    .where(eq(employee_education.employee_uuid, employee_uuid));

  const data = await employeeEducationPromise;

  return c.json(data || [], HSCode.OK);
};
