import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { product_variant_values_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product_variant_values_entry);

export const insertSchema = createInsertSchema(
  product_variant_values_entry,
  {
    uuid: schema => schema.uuid.length(15),
    product_variant_uuid: schema => schema.product_variant_uuid.length(15),
    product_attributes_uuid: schema => schema.product_attributes_uuid.length(15),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_by: schema => schema.updated_by.length(15).optional(),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  product_variant_uuid: true,
  product_attributes_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  value: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
