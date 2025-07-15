import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetConfigurationEntryDetailsByConfigurationUuidRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { configuration, leave_policy, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(configuration).values(value).returning({
    name: configuration.id,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(configuration)
    .set(updates)
    .where(eq(configuration.uuid, uuid))
    .returning({
      name: configuration.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(configuration)
    .where(eq(configuration.uuid, uuid))
    .returning({
      name: configuration.id,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const configurationPromise = db
    .select({
      uuid: configuration.uuid,
      id: configuration.id,
      leave_policy_uuid: configuration.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      created_by: configuration.created_by,
      created_by_name: users.name,
      created_at: configuration.created_at,
      updated_at: configuration.updated_at,
      remarks: configuration.remarks,
      configuration_entry: sql`(
          SELECT COALESCE(
            json_agg(json_build_object(
              'uuid', ce.uuid,
              'id', ce.id, 
              'leave_category_uuid', ce.leave_category_uuid,
              'leave_category_name', lc.name,
              'maximum_number_of_allowed_leaves', ce.maximum_number_of_allowed_leaves,
              'enable_earned_leave', ce.enable_earned_leave
            )), '[]'::json
          )
          FROM hr.configuration_entry ce
          LEFT JOIN hr.leave_category lc ON ce.leave_category_uuid = lc.uuid
          WHERE ce.configuration_uuid = ${configuration.uuid}
        )`,
    })
    .from(configuration)
    .leftJoin(
      leave_policy,
      eq(configuration.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(users, eq(configuration.created_by, users.uuid))
    .orderBy(desc(configuration.created_at));

  const data = await configurationPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const configurationPromise = db
    .select({
      uuid: configuration.uuid,
      id: configuration.id,
      leave_policy_uuid: configuration.leave_policy_uuid,
      leave_policy_name: leave_policy.name,
      created_by: configuration.created_by,
      created_by_name: users.name,
      created_at: configuration.created_at,
      updated_at: configuration.updated_at,
      remarks: configuration.remarks,
    })
    .from(configuration)
    .leftJoin(
      leave_policy,
      eq(configuration.leave_policy_uuid, leave_policy.uuid),
    )
    .leftJoin(users, eq(configuration.created_by, users.uuid))
    .where(eq(configuration.uuid, uuid));

  const [data] = await configurationPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};

export const getConfigurationEntryDetailsByConfigurationUuid: AppRouteHandler<GetConfigurationEntryDetailsByConfigurationUuidRoute> = async (c: any) => {
  const { configuration_uuid } = c.req.valid('param');

  const api = createApi(c);

  const fetchData = async (endpoint: string) =>
    await api
      .get(`${endpoint}/${configuration_uuid}`)
      .then(response => response.data)
      .catch((error) => {
        console.error(
          `Error fetching data from ${endpoint}:`,
          error.message,
        );
        throw error;
      });

  const [configuration, configuration_entry] = await Promise.all([
    fetchData('/v1/hr/configuration'),
    fetchData('/v1/hr/configuration-entry/by'),
  ]);
  const response = {
    ...configuration,
    configuration_entry: configuration_entry || [],
  };

  return c.json(response, HSCode.OK);
};
