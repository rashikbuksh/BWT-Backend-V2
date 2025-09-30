import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { forum } from '../schema';

//* crud
export const selectSchema = createSelectSchema(forum);

export const insertSchema = createInsertSchema(
  forum,
  {
    uuid: schema => schema.uuid.length(15),
    user_uuid: schema => schema.user_uuid.length(15).optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_by: schema => schema.updated_by.length(15).optional(),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  question: true,
  created_at: true,
}).partial({
  user_uuid: true,
  name: true,
  phone: true,
  answer: true,
  is_answered: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
  created_by: true,
});
export const patchSchema = insertSchema.partial();
