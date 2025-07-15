import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { special_holidays } from '../schema';

//* crud
export const selectSchema = createSelectSchema(special_holidays);

export const insertSchema = createInsertSchema(
  special_holidays,
  {
    uuid: schema => schema.uuid.length(15),
    workplace_uuid: schema => schema.workplace_uuid.length(15),
    from_date: schema => schema.from_date.regex(dateTimePattern, {
      message: 'from_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    to_date: schema => schema.to_date.regex(dateTimePattern, {
      message: 'to_date must be in the format "YYYY-MM-DD HH:MM:SS"',
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
  name: true,
  workplace_uuid: true,
  from_date: true,
  to_date: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
