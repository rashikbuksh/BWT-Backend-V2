import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';

import { dateTimePattern } from '@/utils';

import { voucher_entry_cost_center } from '../schema';

//* crud
export const selectSchema = createSelectSchema(voucher_entry_cost_center);

export const insertSchema = createInsertSchema(
  voucher_entry_cost_center,
  {
    uuid: schema => schema.uuid.length(15),
    index: z.number(),
    voucher_entry_uuid: schema => schema.voucher_entry_uuid.length(15),
    amount: z.number().default(0),
    cost_center_uuid: schema => schema.cost_center_uuid.length(15),
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
  cost_center_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  amount: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
