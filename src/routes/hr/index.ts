import apply_balance from './apply_balance';
import apply_leave from './apply_leave';
import configuration from './configuration';
import configuration_entry from './configuration_entry';
import department from './department';
import designation from './designation';
import device_list from './device_list';
import device_permission from './device_permission';
import employee from './employee';
import employee_address from './employee_address';
import employee_document from './employee_document';
import employee_education from './employee_education';
import employee_history from './employee_history';
import employment_type from './employment_type';
import general_holiday from './general_holiday';
import leave_category from './leave_category';
import leave_policy from './leave_policy';
import manual_entry from './manual_entry';
import policy_and_notice from './policy_and_notice';
import punch_log from './punch_log';
import roster from './roster';
import salary_entry from './salary_entry';
import salary_increment from './salary_increment';
import salary_occasional from './salary_occasional';
import shift_group from './shift_group';
import shifts from './shifts';
import special_holidays from './special_holidays';
import sub_department from './sub_department';
import users from './users';
import workplace from './workplace';

export default [
  department,
  designation,
  users,
  sub_department,
  workplace,
  employment_type,
  special_holidays,
  device_list,
  general_holiday,
  shifts,
  shift_group,
  roster,
  leave_policy,
  leave_category,
  configuration,
  configuration_entry,
  employee,
  employee_address,
  employee_history,
  employee_document,
  device_permission,
  employee_education,
  punch_log,
  policy_and_notice,
  manual_entry,
  apply_leave,
  apply_balance,
  salary_occasional,
  salary_increment,
  salary_entry,
];
