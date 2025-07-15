import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { roster } from '../schema';

//* crud
export const selectSchema = createSelectSchema(roster, {
  shift_group_uuid: schema => schema.shift_group_uuid.length(15),
  shifts_uuid: schema => schema.shifts_uuid.length(15),
  effective_date: schema => schema.effective_date.regex(dateTimePattern, {
    message: 'effective_date must be in the format "YYYY-MM-DD HH:MM:SS"',
  }),
  off_days: z.array(z.string()).optional(),
  created_by: schema => schema.created_by.length(15),
  created_at: schema => schema.created_at.regex(dateTimePattern, {
    message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
  }),
  updated_at: schema => schema.updated_at.regex(dateTimePattern, {
    message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
  }),
}).partial({
  id: true,
});

export const insertSchema = createInsertSchema(
  roster,
  {
    shift_group_uuid: schema => schema.shift_group_uuid.length(15),
    shifts_uuid: schema => schema.shifts_uuid.length(15),
    effective_date: schema => schema.effective_date.regex(dateTimePattern, {
      message: 'effective_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    off_days: z.array(z.string()).optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  shift_group_uuid: true,
  shifts_uuid: true,
  effective_date: true,
  created_by: true,
  created_at: true,
}).partial({
  off_days: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
