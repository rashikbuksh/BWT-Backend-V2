import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { stock } from '../schema';

//* crud
export const selectSchema = createSelectSchema(stock);

export const insertSchema = createInsertSchema(
  stock,
  {
    uuid: schema => schema.uuid.length(15),
    product_uuid: schema => schema.product_uuid.length(15),
    created_by: schema => schema.created_by.length(15),
    warehouse_1: z.number().optional(),
    warehouse_2: z.number().optional(),
    warehouse_3: z.number().optional(),
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
  product_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  warehouse_1: true,
  warehouse_2: true,
  warehouse_3: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
