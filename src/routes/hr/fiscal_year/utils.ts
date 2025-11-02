import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { fiscal_year } from '../schema';

//* crud
export const selectSchema = createSelectSchema(fiscal_year);

export const insertSchema = createInsertSchema(
  fiscal_year,
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
  year: true,
  from_month: true,
  to_month: true,
  created_by: true,
  created_at: true,
}).partial({
  challan_info: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
