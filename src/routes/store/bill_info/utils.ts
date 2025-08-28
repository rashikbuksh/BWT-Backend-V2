import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { bill_info } from '../schema';

//* crud
export const selectSchema = createSelectSchema(bill_info);

export const insertSchema = createInsertSchema(
  bill_info,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
    user_uuid: schema => schema.user_uuid.length(15),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_by: schema => schema.updated_by.length(15),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  created_at: true,
}).partial({
  user_uuid: true,
  name: true,
  phone: true,
  address: true,
  city: true,
  district: true,
  note: true,
  is_ship_different: true,
  updated_at: true,
  updated_by: true,
  remarks: true,
  email: true,
  payment_method: true,
  created_by: true,
  is_paid: true,
});

export const patchSchema = insertSchema.partial();
