import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { product_image } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product_image);

export const insertSchema = createInsertSchema(
  product_image,
  {
    uuid: schema => schema.uuid.length(21),
    product_uuid: schema => schema.product_uuid.length(15),
    variant_uuid: schema => schema.variant_uuid.length(15).optional(),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  product_uuid: true,
  image: true,
  created_by: true,
  created_at: true,
}).partial({
  variant_uuid: true,
  is_main: true,
  updated_at: true,
});

export const patchSchema = insertSchema.partial();
