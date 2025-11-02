import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { festival_bonus } from '../schema';

//* crud
export const selectSchema = createSelectSchema(festival_bonus);

export const insertSchema = createInsertSchema(
  festival_bonus,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    festival_uuid: schema => schema.festival_uuid.length(15),
    fiscal_year_uuid: schema => schema.fiscal_year_uuid.length(15),
    special_consideration: z.number().optional(),
    net_payable: z.number().optional(),
    created_by: schema => schema.created_by.length(15),
    updated_by: schema => schema.updated_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  employee_uuid: true,
  festival_uuid: true,
  fiscal_year_uuid: true,
  net_payable: true,
  created_by: true,
  created_at: true,
}).partial({
  special_consideration: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
