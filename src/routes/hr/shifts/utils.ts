import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { shifts } from '../schema';

//* crud
export const selectSchema = createSelectSchema(shifts);

export const insertSchema = createInsertSchema(
  shifts,
  {
    uuid: schema => schema.uuid.length(15),
    start_time: schema => schema.start_time.regex(dateTimePattern, {
      message: 'start_time must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    end_time: schema => schema.end_time.regex(dateTimePattern, {
      message: 'end_time must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    late_time: schema => schema.late_time.regex(dateTimePattern, {
      message: 'late_time must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    early_exit_before: schema => schema.early_exit_before.regex(dateTimePattern, {
      message: 'early_exit_before must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    first_half_end: schema => schema.first_half_end.regex(dateTimePattern, {
      message: 'first_half_end must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    break_time_end: schema => schema.break_time_end.regex(dateTimePattern, {
      message: 'break_time_end must be in the format "YYYY-MM-DD HH:MM:SS"',
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
  start_time: true,
  end_time: true,
  late_time: true,
  early_exit_before: true,
  first_half_end: true,
  break_time_end: true,
  created_by: true,
  created_at: true,
}).partial({
  default_shift: true,
  color: true,
  status: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
