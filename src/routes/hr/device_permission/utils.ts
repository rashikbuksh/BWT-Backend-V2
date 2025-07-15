import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { device_permission } from '../schema';

//* crud
export const selectSchema = createSelectSchema(device_permission);

export const insertSchema = createInsertSchema(
  device_permission,
  {
    uuid: schema => schema.uuid.length(15),
    device_list_uuid: schema => schema.device_list_uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    temporary_from_date: schema => schema.temporary_from_date.regex(dateTimePattern, {
      message: 'temporary_from_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    temporary_to_date: schema => schema.temporary_to_date.regex(dateTimePattern, {
      message: 'temporary_to_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  device_list_uuid: true,
  employee_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  permission_type: true,
  temporary_from_date: true,
  temporary_to_date: true,
  rfid_access: true,
  fingerprint_access: true,
  face_access: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
