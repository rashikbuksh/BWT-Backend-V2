import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';

import { dateTimePattern } from '@/utils';

import { voucher_entry_payment } from '../schema';

//* crud
export const selectSchema = createSelectSchema(voucher_entry_payment);

export const insertSchema = createInsertSchema(
  voucher_entry_payment,
  {
    uuid: schema => schema.uuid.length(15),
    amount: z.number().default(0),
    index: z.number(),
    date: schema => schema.date.regex(dateTimePattern, {
      message: 'date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    voucher_entry_uuid: schema => schema.voucher_entry_uuid.length(15),
    trx_no: schema => schema.trx_no.optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_by: schema => schema.updated_by.optional(),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  index: true,
  voucher_entry_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  trx_no: true,
  date: true,
  amount: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
