import type { AppRouteHandler } from '@/lib/types';

import { and, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import createApi from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetNotAssignedEmployeeForPermissionByDeviceListUuidRoute, GetOneRoute, ListRoute, PatchRoute, PostSyncUser, RemoveRoute } from './routes';

import { device_list, device_permission, employee, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const deviceInfo = await db.select()
    .from(device_list)
    .where(eq(device_list.uuid, value.device_list_uuid));

  if (deviceInfo.length === 0)
    return ObjectNotFound(c);

  const sn = deviceInfo[0]?.identifier;

  const api = createApi(c);

  const syncToDevice = api.post(
    `/v1/hr/sync-to-device?sn=${sn}&employee_uuid=${value?.employee_uuid}`,
  );

  await syncToDevice.then((response) => {
    console.warn(response, ' response from sync to device');
    if (response.status === HSCode.OK) {
      console.warn(`[hr-device-permission] Successfully synced employee_uuid=${value?.employee_uuid} to device SN=${sn}`);
    }
    else {
      console.error(`[hr-device-permission] Failed to sync employee_uuid=${value?.employee_uuid} to device SN=${sn}`);
    }
  }).catch((error) => {
    console.error(`[hr-device-permission] Error syncing employee_uuid=${value?.employee_uuid} to device SN=${sn}:`, error);
  });

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

  // Build dynamic where conditions based on provided query parameters
  const whereConditions = [];

  if (employee_uuid) {
    whereConditions.push(eq(device_permission.employee_uuid, employee_uuid));
  }

  if (device_list_uuid) {
    whereConditions.push(eq(device_permission.device_list_uuid, device_list_uuid));
  }

  if (permission_type) {
    whereConditions.push(eq(device_permission.permission_type, permission_type));
  }

  // Apply where conditions if any exist
  if (whereConditions.length > 0) {
    devicePermissionPromise.where(
      whereConditions.length === 1 ? whereConditions[0] : and(...whereConditions),
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

export const syncUser: AppRouteHandler<PostSyncUser> = async (c: any) => {
  const { employee_uuid, sn } = c.req.valid('query');

  console.warn(employee_uuid, ' employee_uuid');

  const userInfo = await db.select({
    name: users.name,
  })
    .from(users)
    .leftJoin(employee, eq(users.uuid, employee.user_uuid))
    .where(eq(employee.uuid, employee_uuid));

  console.warn(userInfo, ' userInfo');

  const api = createApi(c);

  // Clear queue before adding user to prevent command conflicts
  const clearQueue = await api.post(`/iclock/device/clear-queue?sn=${sn}`, {});

  await clearQueue;

  const requestBody = { users: [{ name: userInfo[0].name, privilege: 0 }], pinKey: 'PIN', deviceSN: [sn] };
  console.warn(`[hr-device-permission] Sending request to add user bulk:`, JSON.stringify(requestBody, null, 2));

  const response = await api.post(
    `/iclock/add/user/bulk?sn=${sn}`,
    requestBody,
  );

  console.warn(`[hr-device-permission] Raw response from add user bulk:`, JSON.stringify(response, null, 2));

  // Wait a moment for device to process the user addition, then refresh user list
  setTimeout(async () => {
    try {
      console.warn(`[hr-device-permission] Refreshing user list for device ${sn} after user addition`);
      await api.post(`/iclock/device/refresh-users?sn=${sn}`, {});
    }
    catch (error) {
      console.error(`[hr-device-permission] Failed to refresh users for device ${sn}:`, error);
    }
  }, 3000); // Wait 3 seconds

  // Check if response and response.data exist
  if (!response || !response.data) {
    console.error(`[hr-device-permission] Invalid response structure:`, response);
    return c.json(createToast('error', `Failed to sync ${userInfo[0].name} to ${sn}: Invalid response from device.`), HSCode.INTERNAL_SERVER_ERROR);
  }

  // Check if processedUsers exists and has at least one item
  if (!response.data.processedUsers || !Array.isArray(response.data.processedUsers) || response.data.processedUsers.length === 0) {
    console.error(`[hr-device-permission] No processed users in response:`, response.data);
    return c.json(createToast('error', `Failed to sync ${userInfo[0].name} to ${sn}: No users were processed.`), HSCode.INTERNAL_SERVER_ERROR);
  }

  const processedUser = response.data.processedUsers[0];

  // Check if the processed user has a pin
  if (!processedUser || typeof processedUser.pin === 'undefined') {
    console.error(`[hr-device-permission] No PIN assigned to processed user:`, processedUser);
    return c.json(createToast('error', `Failed to sync ${userInfo[0].name} to ${sn}: No PIN was assigned.`), HSCode.INTERNAL_SERVER_ERROR);
  }

  const pin = processedUser.pin;

  // Check if the operation was successful
  if (response.data.ok === true && pin) {
    console.warn(`[hr-device-permission] Successfully sent user to device SN=${sn} with PIN=${pin}`);

    try {
      const _employeeUpdate = await db.update(employee)
        .set({ pin })
        .where(eq(employee.uuid, employee_uuid))
        .returning();

      console.warn(`[hr-device-permission] Updated employee ${employee_uuid} with PIN=${pin}`);

      return c.json(createToast('create', `${userInfo[0].name} synced to ${sn} with PIN ${pin}.`), HSCode.OK);
    }
    catch (dbError) {
      console.error(`[hr-device-permission] Failed to update employee PIN in database:`, dbError);
      return c.json(createToast('error', `User synced to device but failed to update PIN in database.`), HSCode.INTERNAL_SERVER_ERROR);
    }
  }
  else {
    console.error(`[hr-device-permission] Failed to sync user to device:`, {
      ok: response.data.ok,
      pin,
      errors: response.data.errors || 'No errors provided',
      response: response.data,
    });

    const errorMessage = response.data.errors && response.data.errors.length > 0
      ? response.data.errors[0].error
      : 'Unknown error occurred';

    return c.json(createToast('error', `${userInfo[0].name} not synced to ${sn}: ${errorMessage}`), HSCode.PRECONDITION_FAILED);
  }
};
