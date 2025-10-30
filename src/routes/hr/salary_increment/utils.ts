import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { salary_increment } from '../schema';

//* crud
export const selectSchema = createSelectSchema(salary_increment);

export const insertSchema = createInsertSchema(
  salary_increment,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    amount: z.number().positive().optional(),
    effective_date: schema => schema.effective_date.regex(dateTimePattern, {
      message: 'effective_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),

    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    new_tds: z.number().optional(),
  },
).required({
  uuid: true,
  employee_uuid: true,
  amount: true,
  created_by: true,
  created_at: true,
}).partial({
  effective_date: true,
  amount: true,
  updated_at: true,
  remarks: true,
  approval: true,
  is_approved: true,
  new_tds: true,
});

export const patchSchema = insertSchema.partial();
