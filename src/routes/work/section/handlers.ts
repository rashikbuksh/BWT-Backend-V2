import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { section } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(section).values(value).returning({
    name: section.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(section)
    .set(updates)
    .where(eq(section.uuid, uuid))
    .returning({
      name: section.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(section)
    .where(eq(section.uuid, uuid))
    .returning({
      name: section.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const sectionPromise = db
    .select({
      uuid: section.uuid,
      name: section.name,
      created_by: section.created_by,
      created_by_name: users.name,
      created_at: section.created_at,
      updated_at: section.updated_at,
      remarks: section.remarks,
    })
    .from(section)
    .leftJoin(users, eq(section.created_by, users.uuid))
    .orderBy(desc(section.created_at));

  const data = await sectionPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const sectionPromise = db.select({
    uuid: section.uuid,
    name: section.name,
    created_by: section.created_by,
    created_by_name: users.name,
    created_at: section.created_at,
    updated_at: section.updated_at,
    remarks: section.remarks,
  })
    .from(section)
    .leftJoin(users, eq(section.created_by, users.uuid))
    .where(eq(section.uuid, uuid));

  const [data] = await sectionPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
