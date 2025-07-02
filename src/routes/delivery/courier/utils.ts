import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { courier } from '../schema';

//* crud
export const selectSchema = createSelectSchema(courier);

export const insertSchema = createInsertSchema(
  courier,
  {
    uuid: schema => schema.uuid.length(21),
    name: schema => schema.name.min(1),
    branch: schema => schema.branch.min(1),
    created_by: schema => schema.created_by.length(21),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  name: true,
  branch: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
