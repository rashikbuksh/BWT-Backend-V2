import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { purchase } from '../schema';

//* crud
export const selectSchema = createSelectSchema(purchase);

export const insertSchema = createInsertSchema(
  purchase,
  {
    uuid: schema => schema.uuid.length(21),
    vendor_uuid: schema => schema.vendor_uuid.length(21),
    branch_uuid: schema => schema.branch_uuid.length(21),
    date: schema => schema.date.regex(dateTimePattern, {
      message: 'date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    payment_mode: schema => schema.payment_mode.min(1),
    created_by: schema => schema.created_by.length(21),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  vendor_uuid: true,
  branch_uuid: true,
  date: true,
  payment_mode: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
