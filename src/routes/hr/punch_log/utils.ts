import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { punch_log } from '../schema';

//* crud
export const selectSchema = createSelectSchema(punch_log);

export const insertSchema = createInsertSchema(
  punch_log,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    device_list_uuid: schema => schema.device_list_uuid.length(15),
    punch_time: schema => schema.punch_time.regex(dateTimePattern, {
      message: 'punch_time must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  employee_uuid: true,
  device_list_uuid: true,
}).partial({
  punch_type: true,
  punch_time: true,
});
export const patchSchema = insertSchema.partial();
