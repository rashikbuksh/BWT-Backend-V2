import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';

import { dateTimePattern } from '@/utils';

import { voucher } from '../schema';

//* crud
export const selectSchema = createSelectSchema(voucher);

export const insertSchema = createInsertSchema(
  voucher,
  {
    uuid: schema => schema.uuid.length(15),
    vat_deduction: z.coerce.number().default(0),
    tax_deduction: z.coerce.number().default(0),
    conversion_rate: z.coerce.number().default(1),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    currency_uuid: schema => schema.currency_uuid.length(15),
  },
).required({
  uuid: true,
  date: true,
  category: true,
  narration: true,
  currency_uuid: true,
  created_by: true,
  created_at: true,
  conversion_rate: true,
}).partial({
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
