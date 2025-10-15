import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { shift_group } from '../schema';

//* crud
export const selectSchema = createSelectSchema(shift_group, {
  uuid: schema => schema.uuid.length(15),
  name: schema => schema.name.min(1),
  default_shift: schema => schema.default_shift.optional(),
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
  shift_group,
  {
    uuid: schema => schema.uuid.length(15),
    default_shift: schema => schema.default_shift.optional(),
    shifts_uuid: schema => schema.shifts_uuid.length(15),
    effective_date: schema => schema.effective_date.regex(dateTimePattern, {
      message: 'effective_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    status: schema => schema.status.optional(),
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
  uuid: true,
  name: true,
  shifts_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  effective_date: true,
  default_shift: true,
  status: true,
  off_days: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
