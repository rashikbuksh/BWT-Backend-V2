import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { device_list, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(device_list).values(value).returning({
    name: device_list.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(device_list)
    .set(updates)
    .where(eq(device_list.uuid, uuid))
    .returning({
      name: device_list.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(device_list)
    .where(eq(device_list.uuid, uuid))
    .returning({
      name: device_list.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const deviceListPromise = db
    .select({
      uuid: device_list.uuid,
      id: device_list.id,
      name: device_list.name,
      identifier: device_list.identifier,
      location: device_list.location,
      connection_status: device_list.connection_status,
      phone_number: device_list.phone_number,
      description: device_list.description,
      created_by: device_list.created_by,
      created_by_name: users.name,
      created_at: device_list.created_at,
      updated_at: device_list.updated_at,
      remarks: device_list.remarks,
    })
    .from(device_list)
    .leftJoin(users, eq(device_list.created_by, users.uuid))
    .orderBy(desc(device_list.created_at));

  const data = await deviceListPromise;

  if (data) {
    data.forEach((item) => {
      // call this api to get device connection status
      // /device/health
      const api = createApi(c);
      api.get(`/device/health?sn=${item.identifier}`, {
        'x-device-identifier': item.identifier,
      }).then((res) => {
        res.data.ok ? (item.connection_status = true) : (item.connection_status = false);
      }).catch(() => {
        item.connection_status = false;
      });
    });
  }

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const deviceListPromise = db
    .select({
      uuid: device_list.uuid,
      id: device_list.id,
      name: device_list.name,
      identifier: device_list.identifier,
      location: device_list.location,
      connection_status: device_list.connection_status,
      phone_number: device_list.phone_number,
      description: device_list.description,
      created_by: device_list.created_by,
      created_by_name: users.name,
      created_at: device_list.created_at,
      updated_at: device_list.updated_at,
      remarks: device_list.remarks,
    })
    .from(device_list)
    .leftJoin(users, eq(device_list.created_by, users.uuid))
    .where(eq(device_list.uuid, uuid));

  const [data] = await deviceListPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
