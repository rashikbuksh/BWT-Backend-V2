import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { configuration } from '../schema';

//* crud
export const selectSchema = createSelectSchema(configuration);

export const insertSchema = createInsertSchema(
  configuration,
  {
    uuid: schema => schema.uuid.length(15),
    leave_policy_uuid: schema => schema.leave_policy_uuid.length(15),
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
  leave_policy_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
