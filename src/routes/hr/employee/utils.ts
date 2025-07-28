import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

import { dateTimePattern } from '@/utils';

import { employee } from '../schema';

//* crud
export const selectSchema = createSelectSchema(employee);

export const insertSchema = createInsertSchema(
  employee,
  {
    uuid: schema => schema.uuid.length(15),
    user_uuid: schema => schema.user_uuid.length(15),
    start_date: schema => schema.start_date.regex(dateTimePattern, {
      message: 'start_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    workplace_uuid: schema => schema.workplace_uuid.length(15),
    sub_department_uuid: schema => schema.sub_department_uuid.length(15),
    configuration_uuid: schema => schema.configuration_uuid.length(15),
    employment_type_uuid: schema => schema.employment_type_uuid.length(15),
    end_date: schema => schema.end_date.regex(dateTimePattern, {
      message: 'end_date must be in the format "YYYY-MM-DD HH:MM:SS"',
    }),
    joining_amount: z.number().optional(),
    shift_group_uuid: schema => schema.shift_group_uuid.length(15),
    line_manager_uuid: schema => schema.line_manager_uuid.length(15),
    hr_manager_uuid: schema => schema.hr_manager_uuid.length(15),
    designation_uuid: schema => schema.designation_uuid.length(15),
    department_uuid: schema => schema.department_uuid.length(15),
    leave_policy_uuid: schema => schema.leave_policy_uuid.length(15),
    first_leave_approver_uuid: schema => schema.first_leave_approver_uuid.length(15),
    second_leave_approver_uuid: schema => schema.second_leave_approver_uuid.length(15),
    first_late_approver_uuid: schema => schema.first_late_approver_uuid.length(15),
    second_late_approver_uuid: schema => schema.second_late_approver_uuid.length(15),
    first_manual_entry_approver_uuid: schema => schema.first_manual_entry_approver_uuid.length(15),
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
  user_uuid: true,
  workplace_uuid: true,
  employee_id: true,
  created_by: true,
  created_at: true,
}).partial({
  gender: true,
  start_date: true,
  rfid: true,
  sub_department_uuid: true,
  primary_display_text: true,
  secondary_display_text: true,
  configuration_uuid: true,
  employment_type_uuid: true,
  end_date: true,
  shift_group_uuid: true,
  line_manager_uuid: true,
  hr_manager_uuid: true,
  is_admin: true,
  is_hr: true,
  is_line_manager: true,
  allow_over_time: true,
  exclude_from_attendance: true,
  status: true,
  designation_uuid: true,
  department_uuid: true,
  leave_policy_uuid: true,
  report_position: true,
  company_id: true,
  first_leave_approver_uuid: true,
  second_leave_approver_uuid: true,
  first_late_approver_uuid: true,
  second_late_approver_uuid: true,
  first_manual_entry_approver_uuid: true,
  second_manual_entry_approver_uuid: true,
  father_name: true,
  mother_name: true,
  blood_group: true,
  dob: true,
  national_id: true,
  office_phone: true,
  home_phone: true,
  personal_phone: true,
  joining_amount: true,
  is_resign: true,
  updated_at: true,
  remarks: true,
}).omit({
  id: true,
});

export const patchSchema = insertSchema.partial();
