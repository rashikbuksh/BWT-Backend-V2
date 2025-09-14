import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { accessories } from '../schema';

//* crud
export const selectSchema = createSelectSchema(accessories);

export const insertSchema = createInsertSchema(
  accessories,
  {
    uuid: schema => schema.uuid.length(15),
    user_uuid: schema => schema.user_uuid.length(15),
    quantity: z.number().default(0),
    description: schema => schema.description.optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_by: schema => schema.updated_by.length(15).optional(),
    remarks: schema => schema.remarks.optional(),

  },
).required({
  uuid: true,
  user_uuid: true,
  quantity: true,
  description: true,
  created_at: true,
  created_by: true,
}).partial({
  image_1: true,
  image_2: true,
  image_3: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
