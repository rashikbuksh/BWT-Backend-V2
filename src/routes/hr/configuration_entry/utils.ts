import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

import { dateTimePattern } from '@/utils';

import { configuration_entry } from '../schema';

//* crud
export const selectSchema = createSelectSchema(configuration_entry);

export const insertSchema = createInsertSchema(
  configuration_entry,
  {
    uuid: schema => schema.uuid.length(15),
    configuration_uuid: schema => schema.configuration_uuid.length(15),
    leave_category_uuid: schema => schema.leave_category_uuid.length(15),
    created_by: schema => schema.created_by.length(15),
    created_at: schema => schema.created_at.regex(dateTimePattern, {
      message: 'created_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    updated_at: schema => schema.updated_at.regex(dateTimePattern, {
      message: 'updated_at must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
  },
).required({
  uuid: true,
  configuration_uuid: true,
  leave_category_uuid: true,
  created_by: true,
  created_at: true,
}).partial({
  number_of_leaves_to_provide_file: true,
  maximum_number_of_allowed_leaves: true,
  leave_carry_type: true,
  consecutive_days: true,
  maximum_number_of_leaves_to_carry: true,
  count_off_days_as_leaves: true,
  enable_previous_day_selection: true,
  maximum_number_of_leave_per_month: true,
  previous_date_selected_limit: true,
  applicability: true,
  eligible_after_joining: true,
  enable_pro_rata: true,
  max_avail_time: true,
  enable_earned_leave: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
