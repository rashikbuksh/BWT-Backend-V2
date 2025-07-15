import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetNotAssignedEmployeeForPermissionByDeviceListUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { device_list, device_permission, employee, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(device_permission).values(value).returning({
    name: device_permission.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(device_permission)
    .set(updates)
    .where(eq(device_permission.uuid, uuid))
    .returning({
      name: device_permission.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(device_permission)
    .where(eq(device_permission.uuid, uuid))
    .returning({
      name: device_permission.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { employee_uuid, device_list_uuid, permission_type } = c.req.valid('query');

  const devicePermissionPromise = db
    .select({
      uuid: device_permission.uuid,
      id: device_permission.id,
      device_list_uuid: device_permission.device_list_uuid,
      device_list_name: device_list.name,
      employee_uuid: device_permission.employee_uuid,
      employee_name: users.name,
      permission_type: device_permission.permission_type,
      temporary_from_date: device_permission.temporary_from_date,
      temporary_to_date: device_permission.temporary_to_date,
      rfid_access: device_permission.rfid_access,
      fingerprint_access: device_permission.fingerprint_access,
      face_access: device_permission.face_access,
      created_by: device_permission.created_by,
      created_by_name: createdByUser.name,
      created_at: device_permission.created_at,
      updated_at: device_permission.updated_at,
      remarks: device_permission.remarks,
    })
    .from(device_permission)
    .leftJoin(
      device_list,
      eq(device_permission.device_list_uuid, device_list.uuid),
    )
    .leftJoin(employee, eq(device_permission.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(device_permission.created_by, createdByUser.uuid),
    )
    .orderBy(desc(device_permission.created_at));

  if (employee_uuid && device_list_uuid && permission_type) {
    devicePermissionPromise.where(
      and(
        eq(device_permission.employee_uuid, employee_uuid),
        eq(device_permission.device_list_uuid, device_list_uuid),
        eq(device_permission.permission_type, permission_type),
      ),
    );
  }
  else if (employee_uuid && device_list_uuid) {
    devicePermissionPromise.where(
      and(
        eq(device_permission.employee_uuid, employee_uuid),
        eq(device_permission.device_list_uuid, device_list_uuid),
      ),
    );
  }
  else if (employee_uuid && permission_type) {
    devicePermissionPromise.where(
      and(
        eq(device_permission.employee_uuid, employee_uuid),
        eq(device_permission.permission_type, permission_type),
      ),
    );
  }
  else if (device_list_uuid && permission_type) {
    devicePermissionPromise.where(
      and(
        eq(device_permission.device_list_uuid, device_list_uuid),
        eq(device_permission.permission_type, permission_type),
      ),
    );
  }
  else if (employee_uuid) {
    devicePermissionPromise.where(eq(device_permission.employee_uuid, employee_uuid));
  }
  else if (device_list_uuid) {
    devicePermissionPromise.where(
      eq(device_permission.device_list_uuid, device_list_uuid),
    );
  }
  else if (permission_type) {
    devicePermissionPromise.where(
      eq(device_permission.permission_type, permission_type),
    );
  }

  const data = await devicePermissionPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const devicePermissionPromise = db
    .select({
      uuid: device_permission.uuid,
      id: device_permission.id,
      device_list_uuid: device_permission.device_list_uuid,
      device_list_name: device_list.name,
      employee_uuid: device_permission.employee_uuid,
      employee_name: users.name,
      permission_type: device_permission.permission_type,
      temporary_from_date: device_permission.temporary_from_date,
      temporary_to_date: device_permission.temporary_to_date,
      rfid_access: device_permission.rfid_access,
      fingerprint_access: device_permission.fingerprint_access,
      face_access: device_permission.face_access,
      created_by: device_permission.created_by,
      created_by_name: createdByUser.name,
      created_at: device_permission.created_at,
      updated_at: device_permission.updated_at,
      remarks: device_permission.remarks,
    })
    .from(device_permission)
    .leftJoin(
      device_list,
      eq(device_permission.device_list_uuid, device_list.uuid),
    )
    .leftJoin(employee, eq(device_permission.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .leftJoin(
      createdByUser,
      eq(device_permission.created_by, createdByUser.uuid),
    )
    .where(eq(device_permission.uuid, uuid));

  const [data] = await devicePermissionPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getNotAssignedEmployeeForPermissionByDeviceListUuid: AppRouteHandler<GetNotAssignedEmployeeForPermissionByDeviceListUuidRoute> = async (c: any) => {
  const { device_list_uuid } = c.req.valid('param');

  const query = sql`
        SELECT 
            e.uuid as employee_uuid, 
            u.name as employee_name, 
            e.user_uuid
        FROM hr.employee e
        LEFT JOIN hr.users u ON e.user_uuid = u.uuid
        LEFT JOIN hr.device_permission dp
            ON dp.employee_uuid = e.uuid AND dp.device_list_uuid = ${device_list_uuid}
        WHERE dp.employee_uuid IS NULL;
    `;

  const devicePermissionPromise = db.execute(query);

  const data = await devicePermissionPromise;

  return c.json(data.rows || [], HSCode.OK);
};
