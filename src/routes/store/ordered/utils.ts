import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { ordered } from '../schema';

//* crud
export const selectSchema = createSelectSchema(ordered);

export const insertSchema = createInsertSchema(
  ordered,
  {
    uuid: schema => schema.uuid.length(15),
    bill_info_uuid: schema => schema.bill_info_uuid.length(15),
    product_variant_uuid: schema => schema.product_variant_uuid.length(15),
    selling_price: z.number().optional(),
    quantity: z.number().optional(),
    is_paid: z.boolean().optional().default(false),
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
  bill_info_uuid: true,
  product_variant_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_by: true,
  updated_at: true,
  remarks: true,
  selling_price: true,
  quantity: true,
  is_paid: true,
  order_status: true,
  product_serial: true,
});

export const patchSchema = insertSchema.partial();
