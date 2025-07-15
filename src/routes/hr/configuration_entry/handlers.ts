import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetConfigurationEntryByConfigurationUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { configuration, configuration_entry, leave_category, leave_policy, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(configuration_entry).values(value).returning({
    name: configuration_entry.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(configuration_entry)
    .set(updates)
    .where(eq(configuration_entry.uuid, uuid))
    .returning({
      name: configuration_entry.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(configuration_entry)
    .where(eq(configuration_entry.uuid, uuid))
    .returning({
      name: configuration_entry.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const configurationEntryPromise = db
    .select({
      uuid: configuration_entry.uuid,
      id: configuration_entry.id,
      configuration_uuid: configuration_entry.configuration_uuid,
      leave_policy_uuid: configuration.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      leave_category_uuid: configuration_entry.leave_category_uuid,
      leave_category_name: leave_category.name,
      number_of_leaves_to_provide_file: configuration_entry.number_of_leaves_to_provide_file,
      maximum_number_of_allowed_leaves: configuration_entry.maximum_number_of_allowed_leaves,
      leave_carry_type: configuration_entry.leave_carry_type,
      consecutive_days: configuration_entry.consecutive_days,
      maximum_number_of_leaves_to_carry: configuration_entry.maximum_number_of_leaves_to_carry,
      count_off_days_as_leaves: configuration_entry.count_off_days_as_leaves,
      enable_previous_day_selection: configuration_entry.enable_previous_day_selection,
      maximum_number_of_leave_per_month: configuration_entry.maximum_number_of_leave_per_month,
      previous_date_selected_limit: configuration_entry.previous_date_selected_limit,
      applicability: configuration_entry.applicability,
      eligible_after_joining: configuration_entry.eligible_after_joining,
      enable_pro_rata: configuration_entry.enable_pro_rata,
      max_avail_time: configuration_entry.max_avail_time,
      enable_earned_leave: configuration_entry.enable_earned_leave,
      created_by: configuration_entry.created_by,
      created_by_name: users.name,
      created_at: configuration_entry.created_at,
      updated_at: configuration_entry.updated_at,
      remarks: configuration_entry.remarks,
    })
    .from(configuration_entry)
    .leftJoin(
      leave_category,
      eq(configuration_entry.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(
      configuration,
      eq(configuration_entry.configuration_uuid, configuration.uuid),
    )
    .leftJoin(
      leave_policy,
      eq(configuration.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(users, eq(configuration_entry.created_by, users.uuid))
    .orderBy(desc(configuration_entry.created_at));

  const data = await configurationEntryPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const configurationEntryPromise = db
    .select({
      uuid: configuration_entry.uuid,
      id: configuration_entry.id,
      configuration_uuid: configuration_entry.configuration_uuid,
      leave_policy_uuid: configuration.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      leave_category_uuid: configuration_entry.leave_category_uuid,
      leave_category_name: leave_category.name,
      number_of_leaves_to_provide_file: configuration_entry.number_of_leaves_to_provide_file,
      maximum_number_of_allowed_leaves: configuration_entry.maximum_number_of_allowed_leaves,
      leave_carry_type: configuration_entry.leave_carry_type,
      consecutive_days: configuration_entry.consecutive_days,
      maximum_number_of_leaves_to_carry: configuration_entry.maximum_number_of_leaves_to_carry,
      count_off_days_as_leaves: configuration_entry.count_off_days_as_leaves,
      enable_previous_day_selection: configuration_entry.enable_previous_day_selection,
      maximum_number_of_leave_per_month: configuration_entry.maximum_number_of_leave_per_month,
      previous_date_selected_limit: configuration_entry.previous_date_selected_limit,
      applicability: configuration_entry.applicability,
      eligible_after_joining: configuration_entry.eligible_after_joining,
      enable_pro_rata: configuration_entry.enable_pro_rata,
      max_avail_time: configuration_entry.max_avail_time,
      enable_earned_leave: configuration_entry.enable_earned_leave,
      created_by: configuration_entry.created_by,
      created_by_name: users.name,
      created_at: configuration_entry.created_at,
      updated_at: configuration_entry.updated_at,
      remarks: configuration_entry.remarks,
    })
    .from(configuration_entry)
    .leftJoin(
      leave_category,
      eq(configuration_entry.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(
      configuration,
      eq(configuration_entry.configuration_uuid, configuration.uuid),
    )
    .leftJoin(
      leave_policy,
      eq(configuration.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(users, eq(configuration_entry.created_by, users.uuid))
    .where(eq(configuration_entry.uuid, uuid));

  const [data] = await configurationEntryPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getConfigurationEntryByConfigurationUuid: AppRouteHandler<GetConfigurationEntryByConfigurationUuidRoute> = async (c: any) => {
  const { configuration_uuid } = c.req.valid('param');

  const configurationEntryPromise = db
    .select({
      uuid: configuration_entry.uuid,
      id: configuration_entry.id,
      configuration_uuid: configuration_entry.configuration_uuid,
      leave_policy_uuid: configuration.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      leave_category_uuid: configuration_entry.leave_category_uuid,
      leave_category_name: leave_category.name,
      number_of_leaves_to_provide_file: configuration_entry.number_of_leaves_to_provide_file,
      maximum_number_of_allowed_leaves: configuration_entry.maximum_number_of_allowed_leaves,
      leave_carry_type: configuration_entry.leave_carry_type,
      consecutive_days: configuration_entry.consecutive_days,
      maximum_number_of_leaves_to_carry: configuration_entry.maximum_number_of_leaves_to_carry,
      count_off_days_as_leaves: configuration_entry.count_off_days_as_leaves,
      enable_previous_day_selection: configuration_entry.enable_previous_day_selection,
      maximum_number_of_leave_per_month: configuration_entry.maximum_number_of_leave_per_month,
      previous_date_selected_limit: configuration_entry.previous_date_selected_limit,
      applicability: configuration_entry.applicability,
      eligible_after_joining: configuration_entry.eligible_after_joining,
      enable_pro_rata: configuration_entry.enable_pro_rata,
      max_avail_time: configuration_entry.max_avail_time,
      enable_earned_leave: configuration_entry.enable_earned_leave,
      created_by: configuration_entry.created_by,
      created_by_name: users.name,
      created_at: configuration_entry.created_at,
      updated_at: configuration_entry.updated_at,
      remarks: configuration_entry.remarks,
    })
    .from(configuration_entry)
    .leftJoin(
      leave_category,
      eq(configuration_entry.leave_category_uuid, leave_category.uuid),
    )
    .leftJoin(
      configuration,
      eq(configuration_entry.configuration_uuid, configuration.uuid),
    )
    .leftJoin(
      leave_policy,
      eq(configuration.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(users, eq(configuration_entry.created_by, users.uuid))
    .where(eq(configuration.uuid, configuration_uuid))
    .orderBy(desc(configuration_entry.created_at));

  const data = await configurationEntryPromise;

  return c.json(data || [], HSCode.OK);
};
