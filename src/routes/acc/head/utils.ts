import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { head } from '../schema';

//* crud
export const selectSchema = createSelectSchema(head);

export const insertSchema = createInsertSchema(
  head,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
    title: schema => schema.title.min(1),
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
  title: true,
  created_by: true,
  created_at: true,
}).partial({
  is_fixed: true,
  type: true,
  group_number: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
  index: true,
});

export const patchSchema = insertSchema.partial();
