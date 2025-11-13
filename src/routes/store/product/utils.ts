import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { product } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product);

export const insertSchema = createInsertSchema(
  product,
  {
    uuid: schema => schema.uuid.length(15),
    title: schema => schema.title.min(1),
    category_uuid: schema => schema.category_uuid.length(15),
    warranty_days: z.number().optional(),
    service_warranty_days: z.number().min(0).optional().default(0),
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
  model_uuid: true,
  service_warranty_days: true,
  created_by: true,
  created_at: true,
  title: true,
}).partial({
  category_uuid: true,
  warranty_days: true,
  updated_at: true,
  remarks: true,
  specifications_description: true,
  care_maintenance_description: true,
  attribute_list: true,
  is_published: true,
  extra_information: true,
  refurbished: true,
  is_affiliate: true,
});

export const patchSchema = insertSchema.partial();
