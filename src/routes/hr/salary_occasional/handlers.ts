import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, salary_occasional, special_holidays, users } from '../schema';

const createdByUser = alias(users, 'createdByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(salary_occasional).values(value).returning({
    name: salary_occasional.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(salary_occasional)
    .set(updates)
    .where(eq(salary_occasional.uuid, uuid))
    .returning({
      name: salary_occasional.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(salary_occasional)
    .where(eq(salary_occasional.uuid, uuid))
    .returning({
      name: salary_occasional.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const salaryOccasionalPromise = db
    .select({
      uuid: salary_occasional.uuid,
      employee_uuid: salary_occasional.employee_uuid,
      employee_name: users.name,
      month: salary_occasional.month,
      year: salary_occasional.year,
      special_holidays_uuid: salary_occasional.special_holidays_uuid,
      special_holidays_name: special_holidays.name,
      amount: PG_DECIMAL_TO_FLOAT(salary_occasional.amount),
      created_by: salary_occasional.created_by,
      created_by_name: users.name,
      created_at: salary_occasional.created_at,
      updated_at: salary_occasional.updated_at,
      remarks: salary_occasional.remarks,
    })
    .from(salary_occasional)
    .leftJoin(employee, eq(salary_occasional.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      special_holidays,
      eq(salary_occasional.special_holidays_uuid, special_holidays.uuid),
    )
    .leftJoin(
      createdByUser,
      eq(salary_occasional.created_by, createdByUser.uuid),
    )
    .orderBy(desc(salary_occasional.created_at));

  const data = await salaryOccasionalPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const salaryOccasionalPromise = db
    .select({
      uuid: salary_occasional.uuid,
      employee_uuid: salary_occasional.employee_uuid,
      employee_name: users.name,
      month: salary_occasional.month,
      year: salary_occasional.year,
      special_holidays_uuid: salary_occasional.special_holidays_uuid,
      special_holidays_name: special_holidays.name,
      amount: PG_DECIMAL_TO_FLOAT(salary_occasional.amount),
      created_by: salary_occasional.created_by,
      created_by_name: users.name,
      created_at: salary_occasional.created_at,
      updated_at: salary_occasional.updated_at,
      remarks: salary_occasional.remarks,
    })
    .from(salary_occasional)
    .leftJoin(employee, eq(salary_occasional.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      special_holidays,
      eq(salary_occasional.special_holidays_uuid, special_holidays.uuid),
    )
    .leftJoin(
      createdByUser,
      eq(salary_occasional.created_by, createdByUser.uuid),
    )
    .where(eq(salary_occasional.uuid, uuid));

  const [data] = await salaryOccasionalPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
