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
    // size_uuid: schema => schema.size_uuid.length(15),
    warranty_days: z.number().optional(),
    service_warranty_days: z.number().min(0).optional().default(0),
    // type: z.string().optional().default('product'),
    // is_maintaining_stock: z.boolean().optional().default(false),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
    // warehouse_1: z.number().optional(),
    // warehouse_2: z.number().optional(),
    // warehouse_3: z.number().optional(),
    // warehouse_4: z.number().optional(),
    // warehouse_5: z.number().optional(),
    // warehouse_6: z.number().optional(),
    // warehouse_7: z.number().optional(),
    // warehouse_8: z.number().optional(),
    // warehouse_9: z.number().optional(),
    // warehouse_10: z.number().optional(),
    // warehouse_11: z.number().optional(),
    // warehouse_12: z.number().optional(),
  },
).required({
  uuid: true,
  // name: true,
  category_uuid: true,
  model_uuid: true,
  // size_uuid: true,
  service_warranty_days: true,
  //  type: true,
  created_by: true,
  created_at: true,
  title: true,
}).partial({
  warranty_days: true,
  // is_maintaining_stock: true,
  updated_at: true,
  remarks: true,
  // warehouse_1: true,
  // warehouse_2: true,
  // warehouse_3: true,
  // warehouse_4: true,
  // warehouse_5: true,
  // warehouse_6: true,
  // warehouse_7: true,
  // warehouse_8: true,
  // warehouse_9: true,
  // warehouse_10: true,
  // warehouse_11: true,
  // warehouse_12: true,
  specifications_description: true,
  care_maintenance_description: true,
  attribute_list: true,
  is_published: true,
  extra_information: true,
  refurbished: true,
});

export const patchSchema = insertSchema.partial();
