import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { PG_DECIMAL_TO_FLOAT } from '@/lib/variables';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { users, workplace } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(workplace).values(value).returning({
    name: workplace.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(workplace)
    .set(updates)
    .where(eq(workplace.uuid, uuid))
    .returning({
      name: workplace.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(workplace)
    .where(eq(workplace.uuid, uuid))
    .returning({
      name: workplace.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  // const data = await db.query.department.findMany();

  const workplacePromise = db
    .select({
      uuid: workplace.uuid,
      id: workplace.id,
      name: workplace.name,
      hierarchy: workplace.hierarchy,
      status: workplace.status,
      latitude: PG_DECIMAL_TO_FLOAT(workplace.latitude),
      longitude: PG_DECIMAL_TO_FLOAT(workplace.longitude),
      created_by: workplace.created_by,
      created_by_name: users.name,
      created_at: workplace.created_at,
      updated_at: workplace.updated_at,
      remarks: workplace.remarks,
    })
    .from(workplace)
    .leftJoin(users, eq(workplace.created_by, users.uuid))
    .orderBy(desc(workplace.created_at));

  const data = await workplacePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const workplacePromise = db
    .select({
      uuid: workplace.uuid,
      id: workplace.id,
      name: workplace.name,
      hierarchy: workplace.hierarchy,
      status: workplace.status,
      latitude: PG_DECIMAL_TO_FLOAT(workplace.latitude),
      longitude: PG_DECIMAL_TO_FLOAT(workplace.longitude),
      created_by: workplace.created_by,
      created_by_name: users.name,
      created_at: workplace.created_at,
      updated_at: workplace.updated_at,
      remarks: workplace.remarks,
    })
    .from(workplace)
    .leftJoin(users, eq(workplace.created_by, users.uuid))
    .where(eq(workplace.uuid, uuid));

  const [data] = await workplacePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
