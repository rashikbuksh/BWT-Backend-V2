import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { purchase_return_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(purchase_return_entry);

export const insertSchema = createInsertSchema(
  purchase_return_entry,
  {
    uuid: schema => schema.uuid.length(21),
    purchase_return_uuid: schema => schema.purchase_return_uuid.length(21),
    product_uuid: schema => schema.product_uuid.length(21),
    quantity: schema => schema.quantity.min(1, {
      message: 'quantity must be at least 1',
    }),
    price_per_unit: schema => schema.price_per_unit.min(0, {
      message: 'price_per_unit must be at least 0',
    }),
    created_by: schema => schema.created_by.length(21),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
  },
).required({
  uuid: true,
  purchase_return_uuid: true,
  product_uuid: true,
  quantity: true,
  price_per_unit: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
