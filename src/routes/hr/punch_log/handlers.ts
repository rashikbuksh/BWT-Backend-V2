import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { device_list, employee, punch_log, users } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(punch_log).values(value).returning({
    name: punch_log.uuid,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(punch_log)
    .set(updates)
    .where(eq(punch_log.uuid, uuid))
    .returning({
      name: punch_log.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(punch_log)
    .where(eq(punch_log.uuid, uuid))
    .returning({
      name: punch_log.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const { employee_uuid } = c.req.valid('query');

  const punchLogPromise = db
    .select({
      uuid: punch_log.uuid,
      employee_uuid: punch_log.employee_uuid,
      employee_name: users.name,
      device_list_uuid: punch_log.device_list_uuid,
      device_list_name: device_list.name,
      punch_type: punch_log.punch_type,
      punch_time: punch_log.punch_time,
    })
    .from(punch_log)
    .leftJoin(device_list, eq(punch_log.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(punch_log.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(
      employee_uuid ? eq(punch_log.employee_uuid, employee_uuid) : undefined,
    )
    .orderBy(desc(punch_log.punch_time));

  const data = await punchLogPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const punchLogPromise = db
    .select({
      uuid: punch_log.uuid,
      employee_uuid: punch_log.employee_uuid,
      employee_name: users.name,
      device_list_uuid: punch_log.device_list_uuid,
      device_list_name: device_list.name,
      punch_type: punch_log.punch_type,
      punch_time: punch_log.punch_time,
    })
    .from(punch_log)
    .leftJoin(device_list, eq(punch_log.device_list_uuid, device_list.uuid))
    .leftJoin(employee, eq(punch_log.employee_uuid, employee.uuid))
    .leftJoin(users, eq(employee.user_uuid, users.uuid))
    .where(eq(punch_log.uuid, uuid));

  const [data] = await punchLogPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
