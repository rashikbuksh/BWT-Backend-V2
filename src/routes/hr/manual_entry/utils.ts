import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { manual_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(manual_entry);

export const insertSchema = createInsertSchema(
  manual_entry,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    type: schema => schema.type,
    entry_time: schema => schema.entry_time.regex(dateTimePattern, {
      message: 'entry_time must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    exit_time: schema => schema.exit_time.regex(dateTimePattern, {
      message: 'exit_time must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    reason: schema => schema.reason.max(255),
    area: schema => schema.area.max(255),
    device_list_uuid: schema => schema.device_list_uuid.length(15),
    remarks: schema => schema.remarks.max(500).optional(),
    approval: schema => schema.approval.optional(),
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
  type: true,
  employee_uuid: true,
  reason: true,
  created_by: true,
  created_at: true,
}).partial({
  entry_time: true,
  exit_time: true,
  area: true,
  device_list_uuid: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
