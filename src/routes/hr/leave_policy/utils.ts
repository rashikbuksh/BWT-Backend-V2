import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { leave_policy } from '../schema';

//* crud
export const selectSchema = createSelectSchema(leave_policy);

export const insertSchema = createInsertSchema(
  leave_policy,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
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
  created_by: true,
  created_at: true,
}).partial({
  is_default: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
