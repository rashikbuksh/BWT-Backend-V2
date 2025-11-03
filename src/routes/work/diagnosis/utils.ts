import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { diagnosis } from '../schema';

//* crud
export const selectSchema = createSelectSchema(diagnosis);

export const insertSchema = createInsertSchema(
  diagnosis,
  {
    uuid: schema => schema.uuid.length(15),
    order_uuid: schema => schema.order_uuid.min(1),
    problems_uuid: z.array(z.string()).optional(),
    problem_statement: schema => schema.problem_statement.optional(),
    status: schema => schema.status.optional(),
    status_update_date: schema => schema.status_update_date.optional(),
    proposed_cost: z.number().optional().default(0),
    is_diagnosis_completed: schema => schema.is_diagnosis_completed.optional(),
    is_diagnosis_completed_date: schema => schema.is_diagnosis_completed_date.regex(dateTimePattern, {
      message: 'is_diagnosis_completed_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    is_proceed_to_repair: schema => schema.is_proceed_to_repair.optional(),
    is_proceed_to_repair_date: schema => schema.is_proceed_to_repair_date.regex(dateTimePattern, {
      message: 'is_proceed_to_repair_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }).optional(),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    remarks: schema => schema.remarks.optional(),
    customer_problem_statement: schema => schema.customer_problem_statement.optional(),
    customer_remarks: schema => schema.customer_remarks.optional(),
  },
).required({
  uuid: true,
  order_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  problems_uuid: true,
  problem_statement: true,
  status: true,
  status_update_date: true,
  proposed_cost: true,
  is_diagnosis_completed: true,
  is_diagnosis_completed_date: true,
  is_proceed_to_repair: true,
  is_proceed_to_repair_date: true,
  customer_problem_statement: true,
  customer_remarks: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
