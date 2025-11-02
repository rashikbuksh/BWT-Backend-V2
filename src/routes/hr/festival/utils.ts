import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { festival } from '../schema';

//* crud
export const selectSchema = createSelectSchema(festival);

export const insertSchema = createInsertSchema(
  festival,
  {
    uuid: schema => schema.uuid.length(15),
    created_by: schema => schema.created_by.length(15),
    updated_by: schema => schema.updated_by.length(15),
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
  religion: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
