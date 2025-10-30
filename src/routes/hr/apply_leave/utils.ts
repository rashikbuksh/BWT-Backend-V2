import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { apply_leave } from '../schema';

//* crud
export const selectSchema = createSelectSchema(apply_leave);

export const insertSchema = createInsertSchema(
  apply_leave,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    leave_category_uuid: schema => schema.leave_category_uuid.length(15),
    year: z.number().optional().default(new Date().getFullYear()),
    type: schema => schema.type,
    from_date: schema => schema.from_date.regex(dateTimePattern, {
      message: 'from_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    to_date: schema => schema.to_date.regex(dateTimePattern, {
      message: 'to_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    reason: schema => schema.reason,
    file: schema => schema.file.optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks,
  },
).required({
  uuid: true,
  leave_category_uuid: true,
  employee_uuid: true,
  year: true,
  type: true,
  from_date: true,
  to_date: true,
  reason: true,
  created_by: true,
  created_at: true,
}).partial({
  file: true,
  updated_at: true,
  remarks: true,
  approval: true,
});

export const patchSchema = insertSchema.partial();
