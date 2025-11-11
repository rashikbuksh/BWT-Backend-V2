import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { affiliate_click } from '../schema';

//* crud
export const selectSchema = createSelectSchema(affiliate_click);

export const insertSchema = createInsertSchema(
  affiliate_click,
  {
    affiliate_id: z.number(),
    ip_address: schema => schema.ip_address,
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  affiliate_id: true,
  ip_address: true,
  created_at: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
