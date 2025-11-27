import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';

import { dateTimePattern } from '@/utils';

import { product } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product);

export const insertSchema = createInsertSchema(
  product,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
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
    warehouse_1: z.coerce.number().optional(),
    warehouse_2: z.coerce.number().optional(),
    warehouse_3: z.coerce.number().optional(),
    warehouse_4: z.coerce.number().optional(),
    warehouse_5: z.coerce.number().optional(),
    warehouse_6: z.coerce.number().optional(),
    warehouse_7: z.coerce.number().optional(),
    warehouse_8: z.coerce.number().optional(),
    warehouse_9: z.coerce.number().optional(),
    warehouse_10: z.coerce.number().optional(),
    warehouse_11: z.coerce.number().optional(),
    warehouse_12: z.coerce.number().optional(),
  },
).required({
  uuid: true,
  name: true,
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
