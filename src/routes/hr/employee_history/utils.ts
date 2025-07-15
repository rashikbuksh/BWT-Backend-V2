import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { employee_history } from '../schema';

//* crud
export const selectSchema = createSelectSchema(employee_history);

export const insertSchema = createInsertSchema(
  employee_history,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    start_date: schema => schema.start_date.regex(dateTimePattern, {
      message: 'start_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    end_date: schema => schema.end_date.regex(dateTimePattern, {
      message: 'end_date must be in the format "YYYY-MM-DD HH:MM:SS"',
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
  employee_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  index: true,
  company_name: true,
  company_business: true,
  start_date: true,
  end_date: true,
  department: true,
  designation: true,
  location: true,
  responsibilities: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
