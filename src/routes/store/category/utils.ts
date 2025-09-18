import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { category } from '../schema';

//* crud
export const selectSchema = createSelectSchema(category);

export const insertSchema = createInsertSchema(
  category,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
    // group_uuid: schema => schema.group_uuid.length(15),
    created_by: schema => schema.created_by.length(15),
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
  // group_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  image: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
