import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { product } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product);

export const insertSchema = createInsertSchema(
  product,
  {
    uuid: schema => schema.uuid.length(15),
    title: schema => schema.title.min(1),
    category_uuid: schema => schema.category_uuid.length(15).optional(),
    model_uuid: schema => schema.model_uuid.length(15).optional(),
    warranty_days: schema => schema.warranty_days.optional(),
    service_warranty_days: schema => schema.service_warranty_days.optional(),
    created_by: schema => schema.created_by.length(15).optional(),
    updated_by: schema => schema.updated_by.length(15).optional(),
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
  title: true,
  created_by: true,
  created_at: true,
}).partial({
  updated_by: true,
  category_uuid: true,
  model_uuid: true,
  warranty_days: true,
  service_warranty_days: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
