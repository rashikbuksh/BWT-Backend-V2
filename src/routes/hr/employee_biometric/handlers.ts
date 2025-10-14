import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByEmployeeUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, employee_biometric, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(employee_biometric).values(value).returning({
    name: employee_biometric.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(employee_biometric)
    .set(updates)
    .where(eq(employee_biometric.uuid, uuid))
    .returning({
      name: employee_biometric.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(employee_biometric)
    .where(eq(employee_biometric.uuid, uuid))
    .returning({
      name: employee_biometric.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const employeeBiometricPromise = db
    .select({
      uuid: employee_biometric.uuid,
      employee_uuid: employee_biometric.employee_uuid,
      employee_name: users.name,
      template: employee_biometric.template,
      biometric_type: employee_biometric.biometric_type,
      finger_index: employee_biometric.finger_index,
      created_at: employee_biometric.created_at,
      updated_at: employee_biometric.updated_at,
      remarks: employee_biometric.remarks,
    })
    .from(employee_biometric)
    .leftJoin(employee, eq(employee_biometric.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .orderBy(desc(employee_biometric.created_at));

  const data = await employeeBiometricPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const employeeBiometricPromise = db
    .select({
      uuid: employee_biometric.uuid,
      employee_uuid: employee_biometric.employee_uuid,
      employee_name: users.name,
      template: employee_biometric.template,
      biometric_type: employee_biometric.biometric_type,
      finger_index: employee_biometric.finger_index,
      created_at: employee_biometric.created_at,
      updated_at: employee_biometric.updated_at,
      remarks: employee_biometric.remarks,
    })
    .from(employee_biometric)
    .leftJoin(employee, eq(employee_biometric.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(eq(employee_biometric.uuid, uuid));

  const [data] = await employeeBiometricPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getByEmployeeUuid: AppRouteHandler<GetByEmployeeUuidRoute> = async (c: any) => {
  const { employee_uuid } = c.req.valid('param');

  const employeeBiometricPromise = db
    .select({
      uuid: employee_biometric.uuid,
      employee_uuid: employee_biometric.employee_uuid,
      employee_name: users.name,
      template: employee_biometric.template,
      biometric_type: employee_biometric.biometric_type,
      finger_index: employee_biometric.finger_index,
      created_at: employee_biometric.created_at,
      updated_at: employee_biometric.updated_at,
      remarks: employee_biometric.remarks,
    })
    .from(employee_biometric)
    .leftJoin(employee, eq(employee_biometric.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(eq(employee_biometric.employee_uuid, employee_uuid));

  const data = await employeeBiometricPromise;

  return c.json(data || [], HSCode.OK);
};
