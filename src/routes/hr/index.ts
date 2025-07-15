import configuration from './configuration';
import configuration_entry from './configuration_entry';
import department from './department';
import designation from './designation';
import device_list from './device_list';
import employment_type from './employment_type';
import general_holiday from './general_holiday';
import leave_category from './leave_category';
import leave_policy from './leave_policy';
// import roster from './roster';
// import shift_group from './shift_group';
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
  // shift_group,
  // roster,
  leave_policy,
  leave_category,
  configuration,
  configuration_entry,
];
