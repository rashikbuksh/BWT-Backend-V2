import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetLoanEntryDetailsRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { department, designation, employee, loan, users } from '../schema';

const createdByUser = alias(users, 'createdByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(loan).values(value).returning({
    name: loan.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(loan)
    .set(updates)
    .where(eq(loan.uuid, uuid))
    .returning({
      name: loan.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(loan)
    .where(eq(loan.uuid, uuid))
    .returning({
      name: loan.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  // const { date } = c.req.valid('query');

  const salaryIncrementPromise = db
    .select({
      uuid: loan.uuid,
      employee_uuid: loan.employee_uuid,
      employee_name: users.name,
      type: loan.type,
      amount: PG_DECIMAL_TO_FLOAT(loan.amount),
      date: loan.date,
      created_by: loan.created_by,
      created_by_name: createdByUser.name,
      created_at: loan.created_at,
      updated_at: loan.updated_at,
      remarks: loan.remarks,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: users.department_uuid,
      department_name: department.department,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
    })
    .from(loan)
    .leftJoin(
      createdByUser,
      eq(loan.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(loan.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .orderBy(desc(loan.created_at));

  const data = await salaryIncrementPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const salaryIncrementPromise = db
    .select({
      uuid: loan.uuid,
      employee_uuid: loan.employee_uuid,
      employee_name: users.name,
      type: loan.type,
      amount: PG_DECIMAL_TO_FLOAT(loan.amount),
      date: loan.date,
      created_by: loan.created_by,
      created_by_name: createdByUser.name,
      created_at: loan.created_at,
      updated_at: loan.updated_at,
      remarks: loan.remarks,
      start_date: employee.start_date,
      profile_picture: employee.profile_picture,
      department_uuid: users.department_uuid,
      department_name: department.department,
      designation_uuid: users.designation_uuid,
      designation_name: designation.designation,
    })
    .from(loan)
    .leftJoin(
      createdByUser,
      eq(loan.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(loan.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(department, eq(users.department_uuid, department.uuid))
    .leftJoin(designation, eq(users.designation_uuid, designation.uuid))
    .where(eq(loan.uuid, uuid));

  const [data] = await salaryIncrementPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getLoanEntryDetails: AppRouteHandler<GetLoanEntryDetailsRoute> = async (c: any) => {
  const { loan_uuid } = c.req.valid('param');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}/${loan_uuid}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [loan, loan_entry] = await Promise.all([
    fetchData('/v1/hr/loan'),
    fetchData('/v1/hr/loan-entry/by'),
  ]);
  const response = {
    ...loan,
    loan_entry: loan_entry || [],
  };

  return c.json(response, HSCode.OK);
};
