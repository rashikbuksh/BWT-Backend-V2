import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { workplace } from '../schema';

//* crud
export const selectSchema = createSelectSchema(workplace);

export const insertSchema = createInsertSchema(
  workplace,
  {
    uuid: schema => schema.uuid.length(15),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  },
).required({
  uuid: true,
  name: true,
  created_by: true,
  created_at: true,
}).partial({
  hierarchy: true,
  status: true,
  latitude: true,
  longitude: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
