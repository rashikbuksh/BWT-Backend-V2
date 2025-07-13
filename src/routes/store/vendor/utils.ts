import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { vendor } from '../schema';

//* crud
export const selectSchema = createSelectSchema(vendor);

export const insertSchema = createInsertSchema(
  vendor,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
    model_uuid: schema => schema.model_uuid.length(15),
    company_name: schema => schema.company_name.min(1),
    phone: schema => schema.phone.min(1).max(15),
    address: schema => schema.address.min(1),
    description: schema => schema.description.optional(),
    is_active: z.boolean().default(false),
    created_by: schema => schema.created_by.length(15),
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
  name: true,
  model_uuid: true,
  company_name: true,
  phone: true,
  address: true,
  created_by: true,
  created_at: true,
}).partial({
  description: true,
  is_active: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
