import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { employee_biometric } from '../schema';

//* crud
export const selectSchema = createSelectSchema(employee_biometric);

export const insertSchema = createInsertSchema(
  employee_biometric,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    template: schema => schema.template,
    biometric_type: schema => schema.biometric_type,
    finger_index: schema => schema.finger_index.optional(),
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
  template: true,
  created_at: true,
}).partial({
  finger_index: true,
  biometric_type: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
