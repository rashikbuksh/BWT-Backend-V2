import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { internal_transfer } from '../schema';

//* crud
export const selectSchema = createSelectSchema(internal_transfer);

export const insertSchema = createInsertSchema(
  internal_transfer,
  {
    uuid: schema => schema.uuid.length(15),
    purchase_entry_uuid: schema => schema.purchase_entry_uuid.length(15),
    from_warehouse_uuid: schema => schema.from_warehouse_uuid.length(15),
    to_warehouse_uuid: schema => schema.to_warehouse_uuid.length(15),
    rack_uuid: schema => schema.rack_uuid.length(15),
    floor_uuid: schema => schema.floor_uuid.length(15),
    box_uuid: schema => schema.box_uuid.length(15),
    quantity: z.number().min(0, {
      message: 'quantity must be a positive number',
    }),
    created_by: schema => schema.created_by.length(15),
    updated_by: schema => schema.updated_by.length(15),
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
  purchase_entry_uuid: true,
  from_warehouse_uuid: true,
  to_warehouse_uuid: true,
  quantity: true,
  created_by: true,
  created_at: true,
}).partial({
  rack_uuid: true,
  floor_uuid: true,
  box_uuid: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
