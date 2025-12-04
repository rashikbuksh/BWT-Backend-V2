import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import z from 'zod';

import { dateTimePattern } from '@/utils';

import { fiscal_year } from '../schema';

//* crud
export const selectSchema = createSelectSchema(fiscal_year);

export const insertSchema = createInsertSchema(
  fiscal_year,
  {
    uuid: schema => schema.uuid.length(15),
    jan_budget: z.number().default(0),
    feb_budget: z.number().default(0),
    mar_budget: z.number().default(0),
    apr_budget: z.number().default(0),
    may_budget: z.number().default(0),
    jun_budget: z.number().default(0),
    jul_budget: z.number().default(0),
    aug_budget: z.number().default(0),
    sep_budget: z.number().default(0),
    oct_budget: z.number().default(0),
    nov_budget: z.number().default(0),
    dec_budget: z.number().default(0),
    rate: z.number().default(0),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  year_no: true,
  created_by: true,
  created_at: true,
}).partial({
  start_date: true,
  end_date: true,
  active: true,
  locked: true,
  jan_budget: true,
  feb_budget: true,
  mar_budget: true,
  apr_budget: true,
  may_budget: true,
  jun_budget: true,
  jul_budget: true,
  aug_budget: true,
  sep_budget: true,
  oct_budget: true,
  nov_budget: true,
  dec_budget: true,
  updated_by: true,
  updated_at: true,
  remarks: true,
  currency_uuid: true,
  rate: true,
});

export const patchSchema = insertSchema.partial();
