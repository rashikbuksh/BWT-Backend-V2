import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { leave_policy_log } from '../schema';

//* crud
export const selectSchema = createSelectSchema(leave_policy_log, {
  uuid: schema => schema.uuid.length(15),
  employee_uuid: schema => schema.employee_uuid.length(15),
  leave_policy_uuid: schema => schema.leave_policy_uuid.length(15),
  created_by: schema => schema.created_by.length(15),
  created_at: schema => schema.created_at.regex(dateTimePattern, {
    message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
  }),
  updated_at: schema => schema.updated_at.regex(dateTimePattern, {
    message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
  }),
}).partial({
  sick_used: true,
  casual_used: true,
  maternity_used: true,
  sick_added: true,
  casual_added: true,
  maternity_added: true,
  remarks: true,
});

export const insertSchema = createInsertSchema(
  leave_policy_log,
  {
    uuid: schema => schema.uuid.length(15),
    employee_uuid: schema => schema.employee_uuid.length(15),
    leave_policy_uuid: schema => schema.leave_policy_uuid.length(15),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    sick_added: z.number().optional(),
    casual_added: z.number().optional(),
    maternity_added: z.number().optional(),
  },
).required({
  uuid: true,
  employee_uuid: true,
  leave_policy_uuid: true,
  year: true,
  created_by: true,
  created_at: true,
}).partial({
  sick_used: true,
  casual_used: true,
  maternity_used: true,
  sick_added: true,
  casual_added: true,
  maternity_added: true,
  updated_at: true,
  remarks: true,
});

export const patchSchema = insertSchema.partial();
