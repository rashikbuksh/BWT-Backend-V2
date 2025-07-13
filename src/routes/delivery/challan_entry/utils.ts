import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { challan_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(challan_entry);

export const insertSchema = createInsertSchema(
  challan_entry,
  {
    uuid: schema => schema.uuid.length(15),
    challan_uuid: schema => schema.challan_uuid.length(15),
    order_uuid: schema => schema.order_uuid.length(15),
    created_by: schema => schema.created_by.length(15),
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
  challan_uuid: true,
  order_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
