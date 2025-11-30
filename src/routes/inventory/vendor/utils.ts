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
    brand_uuid: schema => schema.brand_uuid.length(15),
    company_name: schema => schema.company_name.optional(),
    phone: schema => schema.phone.max(15).optional(),
    address: schema => schema.address.optional(),
    description: schema => schema.description.optional(),
    is_active: z.boolean().default(false),
    created_by: schema => schema.created_by.length(15),
    updated_by: schema => schema.updated_by.length(15).optional(),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  name: true,
  created_by: true,
  created_at: true,
}).partial({
  brand_uuid: true,
  company_name: true,
  phone: true,
  address: true,
  updated_by: true,
  description: true,
  is_active: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
