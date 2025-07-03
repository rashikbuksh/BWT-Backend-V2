import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { product } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product);

export const insertSchema = createInsertSchema(
  product,
  {
    uuid: schema => schema.uuid.length(21),
    name: schema => schema.name.min(1),
    category_uuid: schema => schema.category_uuid.length(21),
    model_uuid: schema => schema.model_uuid.length(21),
    size_uuid: schema => schema.size_uuid.length(21),
    warranty_days: z.boolean().optional().default(false),
    service_warranty_days: z.number().min(0).optional().default(0),
    type: z.string().optional().default('product'),
    is_maintaining_stock: z.boolean().optional().default(false),
    created_by: schema => schema.created_by.length(21),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
    warehouse_1: schema => schema.warehouse_1.optional(),
    warehouse_2: schema => schema.warehouse_2.optional(),
    warehouse_3: schema => schema.warehouse_3.optional(),
    warehouse_4: schema => schema.warehouse_4.optional(),
    warehouse_5: schema => schema.warehouse_5.optional(),
    warehouse_6: schema => schema.warehouse_6.optional(),
    warehouse_7: schema => schema.warehouse_7.optional(),
    warehouse_8: schema => schema.warehouse_8.optional(),
    warehouse_9: schema => schema.warehouse_9.optional(),
    warehouse_10: schema => schema.warehouse_10.optional(),
    warehouse_11: schema => schema.warehouse_11.optional(),
    warehouse_12: schema => schema.warehouse_12.optional(),
  },
).required({
  uuid: true,
  name: true,
  category_uuid: true,
  model_uuid: true,
  size_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  warranty_days: true,
  service_warranty_days: true,
  type: true,
  is_maintaining_stock: true,
  updated_at: true,
  remarks: true,
  warehouse_1: true,
  warehouse_2: true,
  warehouse_3: true,
  warehouse_4: true,
  warehouse_5: true,
  warehouse_6: true,
  warehouse_7: true,
  warehouse_8: true,
  warehouse_9: true,
  warehouse_10: true,
  warehouse_11: true,
  warehouse_12: true,
});

export const patchSchema = insertSchema.partial();
