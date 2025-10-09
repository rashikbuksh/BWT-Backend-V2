import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { apply_late } from '../schema';

//* crud
export const selectSchema = createSelectSchema(apply_late);

export const insertSchema = createInsertSchema(
  apply_late,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    date: schema => schema.date.regex(dateTimePattern, {
      message: 'date must be in the format "YYYY-MM-DD HH:MM:SS"',
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
  employee_uuid: true,
  date: true,
  reason: true,
  created_by: true,
  created_at: true,
}).partial({
  status: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
