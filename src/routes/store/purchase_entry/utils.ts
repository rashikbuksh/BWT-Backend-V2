import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { purchase_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(purchase_entry);

export const insertSchema = createInsertSchema(
  purchase_entry,
  {
    uuid: schema => schema.uuid.length(21),
    purchase_uuid: schema => schema.purchase_uuid.length(21),
    product_uuid: schema => schema.product_uuid.length(21),
    serial_no: schema => schema.serial_no.length(50),
    quantity: schema => schema.quantity.min(1, {
      message: 'quantity must be at least 1',
    }),
    price_per_unit: schema => schema.price_per_unit.min(0, {
      message: 'price_per_unit must be at least 0',
    }),
    discount: schema => schema.discount.optional(),
    warehouse_uuid: schema => schema.warehouse_uuid.length(21),
    rack_uuid: schema => schema.rack_uuid.length(21),
    floor_uuid: schema => schema.floor_uuid.length(21),
    box_uuid: schema => schema.box_uuid.length(21),
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
  purchase_uuid: true,
  product_uuid: true,
  serial_no: true,
  quantity: true,
  price_per_unit: true,
  warehouse_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  rack_uuid: true,
  floor_uuid: true,
  box_uuid: true,
  discount: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
