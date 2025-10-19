import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetByEmployeeUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { employee, employee_biometric, users } from '../schema';

// get hand_type and Finger_name from finger_index
// need the data like this
// 'left-index': 'active',
//  'left-thumb': 'active',
//  'right-index': 'active',
//  'right-thumb': 'active',
function getFingerDetails(fingerIndex: number) {
  const fingerMap: Record<number, { hand_type: string; finger_name: string }> = {
    0: { hand_type: 'left', finger_name: 'pinky' },
    1: { hand_type: 'left', finger_name: 'ring' },
    2: { hand_type: 'left', finger_name: 'middle' },
    3: { hand_type: 'left', finger_name: 'index' },
    4: { hand_type: 'left', finger_name: 'thumb' },
    5: { hand_type: 'right', finger_name: 'thumb' },
    6: { hand_type: 'right', finger_name: 'index' },
    7: { hand_type: 'right', finger_name: 'middle' },
    8: { hand_type: 'right', finger_name: 'ring' },
    9: { hand_type: 'right', finger_name: 'pinky' },
  };

  const entry = fingerMap[fingerIndex];
  if (!entry) {
    return { [`unknown-${fingerIndex}`]: 'active' };
  }

  return { [`${entry.hand_type}-${entry.finger_name}`]: 'active' };
}

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

  // Separate data by biometric type
  const fingerprintData = data.filter(record => record.biometric_type === 'fingerprint');
  const faceData = data.filter(record => record.biometric_type === 'face');
  const rfidData = data.filter(record => record.biometric_type === 'rfid');

  // Process fingerprint data to get finger statuses
  const fingerprintStatuses = fingerprintData.reduce((acc, record) => {
    if (record.finger_index) {
      const fingerDetails = getFingerDetails(record.finger_index);
      return { ...acc, ...fingerDetails };
    }
    return acc;
  }, {});

  // Process fingerprint records with individual finger status
  // const processedFingerprintData = fingerprintData.map(record => ({
  //   ...record,
  //   finger_status:
  //   (record.finger_index !== null && record.finger_index !== undefined)
  //     ? getFingerDetails(record.finger_index)
  //     : null,
  // }));

  // Create comprehensive biometric info
  const employeeInfo = data[0]
    ? {
        employee_uuid: data[0].employee_uuid,
        employee_name: data[0].employee_name,
        finger_statuses: fingerprintStatuses || {},
        rfid_number: rfidData.length > 0 ? rfidData[0].template : null,
        biometric_summary: {
          total_records: data.length,
          fingerprint_count: fingerprintData.length,
          face_count: faceData.length,
          rfid_count: rfidData.length,
        },
        // fingerprint_info: {
        //   finger_statuses: fingerprintStatuses || {},
        //   // records: processedFingerprintData || [],
        // },
        // face_info: {
        //   records: faceData || [],
        // },
        // rfid_info: {
        //   records: rfidData || [],
        // },
      }
    : {};

  return c.json(employeeInfo, HSCode.OK);
};
