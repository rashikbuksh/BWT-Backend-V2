import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { department } from '../schema';

//* crud
export const selectSchema = createSelectSchema(department);

export const insertSchema = createInsertSchema(
  department,
  {
    uuid: schema => schema.uuid.length(15),
    department: schema => schema.department.min(1),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  department: true,
  created_at: true,
}).partial({
  hierarchy: true,
  status: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
