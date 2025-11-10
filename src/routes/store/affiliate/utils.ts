import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { affiliate } from '../schema';

//* crud
export const selectSchema = createSelectSchema(affiliate);

export const insertSchema = createInsertSchema(
  affiliate,
  {
    user_uuid: schema => schema.user_uuid.uuid(),
    product_uuid: schema => schema.product_uuid.uuid(),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    visited: z.number().int().min(0),
    purchased: z.number().int().min(0),
  },
).required({
  user_uuid: true,
  product_uuid: true,
  created_at: true,
}).partial({
  visited: true,
  purchased: true,
  updated_at: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
