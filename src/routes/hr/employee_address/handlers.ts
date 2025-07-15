import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByEmployeeUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, employee_address, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');
export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employee_address).values(value).returning({
    name: employee_address.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee_address)
    .set(updates)
    .where(eq(employee_address.uuid, uuid))
    .returning({
      name: employee_address.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(employee_address)
    .where(eq(employee_address.uuid, uuid))
    .returning({
      name: employee_address.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employeeAddressPromise = db
    .select({
      uuid: employee_address.uuid,
      index: employee_address.index,
      address_type: employee_address.address_type,
      employee_uuid: employee_address.employee_uuid,
      employee_name: users.name,
      address: employee_address.address,
      thana: employee_address.thana,
      district: employee_address.district,
      created_by: employee_address.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_address.created_at,
      updated_at: employee_address.updated_at,
      remarks: employee_address.remarks,
    })
    .from(employee_address)
    .leftJoin(employee, eq(employee_address.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_address.created_by, createdByUser.uuid),
    )
    .orderBy(desc(employee_address.created_at));

  const data = await employeeAddressPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employeeAddressPromise = db
    .select({
      uuid: employee_address.uuid,
      index: employee_address.index,
      address_type: employee_address.address_type,
      employee_uuid: employee_address.employee_uuid,
      employee_name: users.name,
      address: employee_address.address,
      thana: employee_address.thana,
      district: employee_address.district,
      created_by: employee_address.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_address.created_at,
      updated_at: employee_address.updated_at,
      remarks: employee_address.remarks,
    })
    .from(employee_address)
    .leftJoin(employee, eq(employee_address.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_address.created_by, createdByUser.uuid),
    )
    .where(eq(employee_address.uuid, uuid));

  const [data] = await employeeAddressPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByEmployeeUuid: AppRouteHandler<GetByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const employeeAddressPromise = db
    .select({
      uuid: employee_address.uuid,
      index: employee_address.index,
      address_type: employee_address.address_type,
      employee_uuid: employee_address.employee_uuid,
      employee_name: users.name,
      address: employee_address.address,
      thana: employee_address.thana,
      district: employee_address.district,
      created_by: employee_address.created_by,
      created_by_name: createdByUser.name,
      created_at: employee_address.created_at,
      updated_at: employee_address.updated_at,
      remarks: employee_address.remarks,
    })
    .from(employee_address)
    .leftJoin(employee, eq(employee_address.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(employee_address.created_by, createdByUser.uuid),
    )
    .where(eq(employee_address.employee_uuid, employee_uuid));

  const data = await employeeAddressPromise;

  return c.json(data || [], HSCode.OK);
};
