import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { group } from '../schema';

//* crud
export const selectSchema = createSelectSchema(group);

export const insertSchema = createInsertSchema(
  group,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
    head_uuid: schema => schema.head_uuid.length(15),
    code: schema => schema.code.min(1).max(10),
    is_fixed: schema => schema.is_fixed.default(false),
    group_number: schema => schema.group_number.optional(),
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
  head_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  is_fixed: true,
  code: true,
  group_number: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
  index: true,
});

export const patchSchema = insertSchema.partial();
