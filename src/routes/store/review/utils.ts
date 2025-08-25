import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { review } from '../schema';

//* crud
export const selectSchema = createSelectSchema(review);

export const insertSchema = createInsertSchema(
  review,
  {
    uuid: schema => schema.uuid.length(15),
    product_uuid: schema => schema.product_uuid.length(15),
    user_uuid: schema => schema.user_uuid.length(15).optional(),
    rating: schema => schema.rating.min(1).max(5),
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
  product_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  user_uuid: true,
  email: true,
  name: true,
  comment: true,
  rating: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});
export const patchSchema = insertSchema.partial();
