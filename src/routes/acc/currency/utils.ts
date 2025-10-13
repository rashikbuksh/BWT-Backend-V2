import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { currency } from '../schema';

//* crud
export const selectSchema = createSelectSchema(currency);

export const insertSchema = createInsertSchema(
  currency,
  {
    uuid: schema => schema.uuid.length(15),
    currency: schema => schema.currency.min(1),
    currency_name: schema => schema.currency_name.min(1),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  currency: true,
  currency_name: true,
  created_by: true,
  created_at: true,
}).partial({
  symbol: true,
  conversion_rate: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
  default: true,
});

export const patchSchema = insertSchema.partial();
