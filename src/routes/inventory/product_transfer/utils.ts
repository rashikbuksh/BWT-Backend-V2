import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { product_transfer } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product_transfer);

export const insertSchema = createInsertSchema(
  product_transfer,
  {
    uuid: schema => schema.uuid.length(15),
    warehouse_uuid: schema => schema.warehouse_uuid.length(15),
    order_uuid: schema => schema.order_uuid.length(15).optional(),
    quantity: z.number().int().positive(),
    created_by: schema => schema.created_by.length(15),
    updated_by: schema => schema.updated_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
    purchase_entry_uuid: schema => schema.purchase_entry_uuid.length(15).optional(),
  },
).required({
  uuid: true,
  purchase_entry_uuid: true,
  warehouse_uuid: true,
  order_uuid: true,
  quantity: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_by: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
