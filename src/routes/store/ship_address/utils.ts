import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { ship_address } from '../schema';

//* crud
export const selectSchema = createSelectSchema(ship_address);

export const insertSchema = createInsertSchema(
  ship_address,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
    bill_info_uuid: schema => schema.bill_info_uuid.length(15),
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
  bill_info_uuid: true,
  company_name: true,
  name: true,
  phone: true,
  address: true,
  city: true,
  district: true,
  note: true,
  zip: true,
  updated_at: true,
  updated_by: true,
  remarks: true,
  created_by: true,
});

export const patchSchema = insertSchema.partial();
