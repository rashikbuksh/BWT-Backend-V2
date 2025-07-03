import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { purchase_return } from '../schema';

//* crud
export const selectSchema = createSelectSchema(purchase_return);

export const insertSchema = createInsertSchema(
  purchase_return,
  {
    uuid: schema => schema.uuid.length(21),
    purchase_uuid: schema => schema.purchase_uuid.length(21),
    warehouse_uuid: schema => schema.warehouse_uuid.length(21),
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
  created_by: true,
  created_at: true,
  warehouse_uuid: true,
}).partial({
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
