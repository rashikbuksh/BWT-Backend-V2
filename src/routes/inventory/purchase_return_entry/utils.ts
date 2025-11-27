import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { purchase_return_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(purchase_return_entry);

export const insertSchema = createInsertSchema(
  purchase_return_entry,
  {
    uuid: schema => schema.uuid.length(15),
    purchase_return_uuid: schema => schema.purchase_return_uuid.length(15),
    purchase_entry_uuid: schema => schema.purchase_entry_uuid.length(15),
    quantity: z.number().optional(),
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
  purchase_return_uuid: true,
  quantity: true,
  purchase_entry_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
