import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { device_list } from '../schema';

//* crud
export const selectSchema = createSelectSchema(device_list);

export const insertSchema = createInsertSchema(
  device_list,
  {
    uuid: schema => schema.uuid.length(15),
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
  name: true,
  identifier: true,
  created_by: true,
  created_at: true,
}).partial({
  location: true,
  connection_status: true,
  phone_number: true,
  description: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
