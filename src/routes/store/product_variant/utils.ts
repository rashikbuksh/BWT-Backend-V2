import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { product_variant } from '../schema';

//* crud
export const selectSchema = createSelectSchema(product_variant);

export const insertSchema = createInsertSchema(
  product_variant,
  {
    uuid: schema => schema.uuid.length(15),
    product_uuid: schema => schema.product_uuid.length(15),
    selling_price: z.number().optional(),
    discount: z.number().optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_by: schema => schema.updated_by.length(15).optional(),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
    warehouse_1: z.number().optional(),
    warehouse_2: z.number().optional(),
    warehouse_3: z.number().optional(),
    warehouse_4: z.number().optional(),
    warehouse_5: z.number().optional(),
    warehouse_6: z.number().optional(),
    warehouse_7: z.number().optional(),
    warehouse_8: z.number().optional(),
    warehouse_9: z.number().optional(),
    warehouse_10: z.number().optional(),
    warehouse_11: z.number().optional(),
    warehouse_12: z.number().optional(),
    selling_warehouse: z.number().optional(),
    index: z.number(),
  },
).required({
  uuid: true,
  product_uuid: true,
  created_by: true,
  created_at: true,
  index: true,
}).partial({
  updated_by: true,
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
  selling_warehouse: true,
  selling_price: true,
  discount: true,
  discount_unit: true,
  image: true,
});

export const patchSchema = insertSchema.partial();
