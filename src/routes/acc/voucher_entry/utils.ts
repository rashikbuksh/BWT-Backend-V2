import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';

import { dateTimePattern } from '@/utils';

import { voucher_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(voucher_entry);

export const insertSchema = createInsertSchema(
  voucher_entry,
  {
    uuid: schema => schema.uuid.length(15),
    ledger_uuid: schema => schema.ledger_uuid.length(15),
    type: schema => schema.type.default('dr'),
    amount: z.number().default(0),
    is_need_cost_center: schema => schema.is_need_cost_center.default(false),
    is_payment: schema => schema.is_payment.default(false),
    description: schema => schema.description.optional(),
    voucher_uuid: schema => schema.voucher_uuid.length(15),
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
  ledger_uuid: true,
  type: true,
  voucher_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  amount: true,
  is_need_cost_center: true,
  is_payment: true,
  description: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
