import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, loan, users } from '../schema';

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
    })
    .from(loan)
    .leftJoin(
      createdByUser,
      eq(loan.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(loan.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
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
    })
    .from(loan)
    .leftJoin(
      createdByUser,
      eq(loan.created_by, createdByUser.uuid),
    )
    .leftJoin(employee, eq(loan.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(eq(loan.uuid, uuid));

  const [data] = await salaryIncrementPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
