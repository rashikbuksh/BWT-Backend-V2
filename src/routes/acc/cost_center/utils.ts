import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { cost_center } from '../schema';

//* crud
export const selectSchema = createSelectSchema(cost_center);

export const insertSchema = createInsertSchema(
  cost_center,
  {
    uuid: schema => schema.uuid.length(15),
    name: schema => schema.name.min(1),
    table_name: schema => schema.table_name.optional(),
    table_uuid: schema => schema.table_uuid.optional(),
    invoice_no: schema => schema.invoice_no.optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_by: schema => schema.updated_by.optional(),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  name: true,
  ledger_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  table_name: true,
  table_uuid: true,
  invoice_no: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
