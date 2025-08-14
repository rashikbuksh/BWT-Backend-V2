import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { salary_occasional } from '../schema';

//* crud
export const selectSchema = createSelectSchema(salary_occasional);

export const insertSchema = createInsertSchema(
  salary_occasional,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    month: schema => schema.month,
    year: schema => schema.year,
    special_holidays_uuid: schema => schema.special_holidays_uuid.length(15).optional(),
    amount: z.number().positive().optional(),
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
  employee_uuid: true,
  month: true,
  year: true,
  created_by: true,
  created_at: true,
}).partial({
  special_holidays_uuid: true,
  amount: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
