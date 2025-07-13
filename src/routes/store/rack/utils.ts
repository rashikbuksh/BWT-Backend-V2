import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { rack } from '../schema';

//* crud
export const selectSchema = createSelectSchema(rack);

export const insertSchema = createInsertSchema(
  rack,
  {
    uuid: schema => schema.uuid.length(15),
    warehouse_uuid: schema => schema.warehouse_uuid.length(15),
    name: schema => schema.name.min(1),
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
  warehouse_uuid: true,
  name: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
