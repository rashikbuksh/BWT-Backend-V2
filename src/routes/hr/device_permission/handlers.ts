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

// export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
//   const value = c.req.valid('json');

//   console.log ('Creating device permissions with value:', value);

//   const deviceInfo = await db.select()
//     .from(device_list)
//     .where(eq(device_list.uuid, value.device_list_uuid));

//   if (deviceInfo.length === 0)
//     return ObjectNotFound(c);

//   const sn = deviceInfo[0]?.identifier;

//   const api = createApi(c);

//   value.map(async (valueOne: any) => {
//     if (valueOne.permission_type === 'temporary') {
//     // For temporary permissions, ensure temporary dates are provided
//       const syncToDevice = api.post(
//         `/v1/hr/sync-to-device?sn=${sn}&employee_uuid=${valueOne?.employee_uuid}&temporary=true&from=${valueOne.temporary_from_date}&to=${valueOne.temporary_to_date}`,
//       );

//       await syncToDevice.then((response) => {
//         console.warn(response, ' response from sync to device');
//         if (response.status === HSCode.OK) {
//           console.warn(`[hr-device-permission] Successfully synced employee_uuid=${valueOne?.employee_uuid} to device SN=${sn}`);
//         }
//         else {
//           console.error(`[hr-device-permission] Failed to sync employee_uuid=${valueOne?.employee_uuid} to device SN=${sn}`);
//         }
//       }).catch((error) => {
//         console.error(`[hr-device-permission] Error syncing employee_uuid=${valueOne?.employee_uuid} to device SN=${sn}:`, error);
//       });
//     }
//     else {
//       const syncToDevice = api.post(
//         `/v1/hr/sync-to-device?sn=${sn}&employee_uuid=${valueOne?.employee_uuid}&temporary=false`,
//       );

//       await syncToDevice.then((response) => {
//         console.warn(response, ' response from sync to device');
//         if (response.status === HSCode.OK) {
//           console.warn(`[hr-device-permission] Successfully synced employee_uuid=${valueOne?.employee_uuid} to device SN=${sn}`);
//         }
//         else {
//           console.error(`[hr-device-permission] Failed to sync employee_uuid=${valueOne?.employee_uuid} to device SN=${sn}`);
//         }
//       }).catch((error) => {
//         console.error(`[hr-device-permission] Error syncing employee_uuid=${valueOne?.employee_uuid} to device SN=${sn}:`, error);
//       });
//     }
//   });

//   const data = await db.insert(device_permission).values(value).returning({
//     name: device_permission.uuid,
//   });

//   return c.json(createToast('create', data.length), HSCode.OK);
// };

// ...existing code...

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const items = Array.isArray(value) ? value : [value];

  // console.log('Creating device permissions with value:', items);

  if (items.length === 0) {
    return c.json(createToast('error', 'No device permission payload provided'), HSCode.PRECONDITION_FAILED);
  }

  // Ensure all items reference the same device_list_uuid (adjust if you want mixed)
  const deviceListUuid = items[0]?.device_list_uuid;
  if (!deviceListUuid) {
    return c.json(createToast('error', 'device_list_uuid is required'), HSCode.PRECONDITION_FAILED);
  }

  // Optional: reject if mixed device_list_uuid across items
  if (items.some(it => it.device_list_uuid !== deviceListUuid)) {
    return c.json(createToast('error', 'All items must have the same device_list_uuid for batch create'), HSCode.PRECONDITION_FAILED);
  }

  const deviceInfo = await db.select()
    .from(device_list)
    .where(eq(device_list.uuid, deviceListUuid));

  if (deviceInfo.length === 0) {
    return ObjectNotFound(c);
  }

  const sn = deviceInfo[0]?.identifier;
  const api = createApi(c);

  for (const item of items) {
    // get employee id from employee_uuid
    const employeeInd = await db.select()
      .from(employee)
      .where(eq(employee.uuid, item.employee_uuid))
      .limit(1)
      .then(results => results[0]);
    item.pin = String(employeeInd.id);
  }

  // Process sync to device sequentially and validate temporary dates
  for (const item of items) {
    if (!item.employee_uuid) {
      console.warn('[hr-device-permission] skipping item without employee_uuid', item);
      continue;
    }

    if (item.permission_type === 'temporary') {
      if (!item.temporary_from_date || !item.temporary_to_date) {
        return c.json(createToast('error', `temporary_from_date and temporary_to_date required for employee ${item.employee_uuid}`), HSCode.PRECONDITION_FAILED);
      }

      const url = `/v1/hr/sync-to-device?sn=${encodeURIComponent(sn)}&employee_uuid=${encodeURIComponent(item.employee_uuid)}&temporary=true&from=${encodeURIComponent(item.temporary_from_date)}&to=${encodeURIComponent(item.temporary_to_date)}&pin=${encodeURIComponent(item.pin)}`;
      try {
        const response = await api.post(url);
        console.warn(response, ' response from sync to device');
        if (response.status === HSCode.OK) {
          console.warn(`[hr-device-permission] Successfully synced employee_uuid=${item.employee_uuid} to device SN=${sn}`);
        }
        else {
          console.error(`[hr-device-permission] Failed to sync employee_uuid=${item.employee_uuid} to device SN=${sn}`, response);
        }
      }
      catch (error) {
        console.error(`[hr-device-permission] Error syncing employee_uuid=${item.employee_uuid} to device SN=${sn}:`, error);
      }
    }
    else {
      const url = `/v1/hr/sync-to-device?sn=${encodeURIComponent(sn)}&employee_uuid=${encodeURIComponent(item.employee_uuid)}&temporary=false&pin=${encodeURIComponent(item.pin)}`;
      try {
        const response = await api.post(url);
        console.warn(response, ' response from sync to device');
        if (response.status === HSCode.OK) {
          console.warn(`[hr-device-permission] Successfully synced employee_uuid=${item.employee_uuid} to device SN=${sn}`);
        }
        else {
          console.error(`[hr-device-permission] Failed to sync employee_uuid=${item.employee_uuid} to device SN=${sn}`, response);
        }
      }
      catch (error) {
        console.error(`[hr-device-permission] Error syncing employee_uuid=${item.employee_uuid} to device SN=${sn}:`, error);
      }
    }
  }

  // Insert into DB (batch or single)
  try {
    const data = await db.insert(device_permission).values(items).returning({
      name: device_permission.uuid,
    });

    const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
    return c.json(createToast('create', count), HSCode.OK);
  }
  catch (dbError) {
    console.error('[hr-device-permission] DB insert error:', dbError);
    return c.json(createToast('error', 'Failed to create device permissions'), HSCode.INTERNAL_SERVER_ERROR);
  }
};
// ...existing code...
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

  const [employeeDataFromDevicePermission] = await db
    .select({
      id: device_permission.id,
      employee_uuid: device_permission.employee_uuid,
    })
    .from(device_permission)
    .where(eq(device_permission.uuid, uuid))
    .limit(1);

  // Ensure we have a linked employee UUID before querying employee table
  if (!employeeDataFromDevicePermission || !employeeDataFromDevicePermission.employee_uuid) {
    console.warn(`[employee-remove] No linked employee UUID found for device_permission UUID=${uuid}`);
  }

  // First, get the employee data including PIN before deletion
  let employeeData;
  if (!employeeDataFromDevicePermission || !employeeDataFromDevicePermission.employee_uuid) {
    employeeData = undefined;
    console.warn(`[employee-remove] No employee UUID available to query employee table for device_permission UUID=${uuid}`);
  }
  else {
    const [emp] = await db
      .select({
        id: employee.id,
        pin: employee.pin,
      })
      .from(employee)
      .where(eq(employee.uuid, employeeDataFromDevicePermission.employee_uuid))
      .limit(1);

    employeeData = emp;
  }

  if (!employeeData) {
    console.warn(`[employee-remove] No employee data found for UUID=${employeeDataFromDevicePermission?.employee_uuid}`);
  }

  // Delete from ZKTeco devices if PIN exists and is valid
  if (employeeData && employeeData.pin && String(employeeData.pin).trim()) {
    try {
      // Import the delete function and shared state from zkteco module
      const { deleteUserFromDevice } = await import('@/routes/zkteco/functions');
      const { commandQueue, usersByDevice } = await import('@/routes/zkteco/handlers');

      console.warn(`[employee-remove] Attempting to delete user with PIN ${employeeData.pin} from ZKTeco devices`);

      const zkResult = await deleteUserFromDevice(
        String(employeeData.pin).trim(),
        commandQueue,
        usersByDevice,
      );

      if (zkResult.success) {
        console.warn(`[employee-remove] Successfully queued deletion of PIN ${employeeData.pin} from ${zkResult.devicesProcessed} ZKTeco devices`);
      }
      else {
        console.error(`[employee-remove] Failed to delete PIN ${employeeData.pin} from ZKTeco devices:`, zkResult.error);
      }
    }
    catch (error) {
      console.error('[employee-remove] Error deleting user from ZKTeco devices:', error);
      // Continue with employee deletion even if ZKTeco deletion fails
    }
  }
  else {
    // Skip ZKTeco deletion if no employee data or PIN
    if (!employeeData) {
      console.warn(`[employee-remove] Skipping ZKTeco deletion - no employee data found for device_permission UUID=${uuid}`);
    }
    else if (!employeeData.pin || !String(employeeData.pin).trim()) {
      console.warn(`[employee-remove] Skipping ZKTeco deletion - no valid PIN found for employee ID=${employeeData.id} (PIN: "${employeeData.pin}")`);
    }
  }

  const [data] = await db.delete(device_permission)
    .where(eq(device_permission.uuid, uuid))
    .returning({
      name: device_permission.uuid,
    });

  if (!data)
    return DataNotFound(c);

  // Return a proper Response on successful deletion to satisfy handler contract
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
  const { employee_uuid, sn, temporary, from, to, pin } = c.req.valid('query');

  console.warn(employee_uuid, ' employee_uuid');

  const userInfo = await db.select({
    name: users.name,
    employee_id: employee.id,
  })
    .from(employee)
    .leftJoin(users, eq(users.uuid, employee.user_uuid))
    .where(eq(employee.uuid, employee_uuid));

  const api = createApi(c);

  // Clear queue before adding user to prevent command conflicts
  const clearQueue = api.post(`/iclock/device/clear-queue?sn=${sn}`, {});

  await clearQueue;

  const requestBody = { users: [{ pin: userInfo[0].employee_id, name: userInfo[0].name, privilege: 0 }], pinKey: 'PIN', deviceSN: [sn] };
  console.warn(`[hr-device-permission] Sending request to add user bulk:`, JSON.stringify(requestBody, null, 2));

  let response = null;

  if (temporary === 'false') {
    response = await api.post(
      `/iclock/add/user/bulk?sn=${sn}`,
      requestBody,
    );

    console.warn(`[hr-device-permission] Raw response from add user bulk:`, JSON.stringify(response, null, 2));

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
  }
  else {
    if (!userInfo[0].employee_id || String(userInfo[0].employee_id).trim() === '' || !pin) {
      console.error(`[hr-device-permission] Employee ID is required to add temporary user but was not found for employee_uuid=${employee_uuid}`);
      return c.json(createToast('error', `Failed to sync ${userInfo[0].name} to ${sn}: Employee ID not found.`), HSCode.PRECONDITION_FAILED);
    }

    // Convert string dates to Date objects for the function
    const startDate = new Date(from);
    const endDate = new Date(to);

    // Validate dates
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      console.error(`[hr-device-permission] Invalid date format for from=${from} or to=${to}`);
      return c.json(createToast('error', `Failed to sync ${userInfo[0].name} to ${sn}: Invalid date format.`), HSCode.PRECONDITION_FAILED);
    }

    const requestBodyTemp = {
      users: [{
        pin: pin || userInfo[0].employee_id.toString(),
        name: userInfo[0].name,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        privilege: '0',
        password: '',
        cardno: '',
        timeZone: userInfo[0].employee_id.toString(),
      }],
    };

    response = await api.post(`/zkteco/add-temporary-user?sn=${sn}`, requestBodyTemp);

    if (response && response.data && response.data.success === true) {
      console.log(`[hr-device-permission] Successfully added temporary user to device SN=${sn} with PIN=${pin || userInfo[0].employee_id}`); // eslint-disable-line no-console
    }
    else {
      console.error(`[hr-device-permission] Failed to add temporary user to device:`, response && response.data);

      // Properly handle the error object
      let errorMessage = 'Unknown error occurred';
      if (response && response.data && response.data.error) {
        if (typeof response.data.error === 'string') {
          errorMessage = response.data.error;
        }
        else if (response.data.error.issues && Array.isArray(response.data.error.issues)) {
          // Handle ZodError
          const zodIssues = response.data.error.issues.map((issue: any) =>
            `${issue.path?.join('.') || 'field'}: ${issue.message}`,
          ).join(', ');
          errorMessage = `Validation error: ${zodIssues}`;
        }
        else if (response.data.error.message) {
          errorMessage = response.data.error.message;
        }
        else {
          errorMessage = JSON.stringify(response.data.error);
        }
      }

      return c.json(createToast('error', `${userInfo[0].name} not synced to ${sn}: ${errorMessage}`), HSCode.PRECONDITION_FAILED);
    }
  }

  // Check if the operation was successful
  if (response && response.data.ok === true) {
    console.log(`[hr-device-permission] Successfully sent user to device SN=${sn} with PIN=${pin}`); // eslint-disable-line no-console
  }
  else {
    console.error(`[hr-device-permission] Failed to sync user to device:`, {
      ok: response && response.data.ok,
      pin,
      errors: (response && response.data.errors) || 'No errors provided',
      response: response && response.data,
    });

    const errorMessage = response && response.data.errors && response.data.errors.length > 0
      ? response.data.errors[0].error
      : 'Unknown error occurred';

    return c.json(createToast('error', `${userInfo[0].name} not synced to ${sn}: ${errorMessage}`), HSCode.PRECONDITION_FAILED);
  }
};
