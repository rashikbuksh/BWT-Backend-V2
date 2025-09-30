import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { tags } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(tags).values(value).returning({
    name: tags.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(tags)
    .set(updates)
    .where(eq(tags.uuid, uuid))
    .returning({
      name: tags.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(tags)
    .where(eq(tags.uuid, uuid))
    .returning({
      name: tags.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const tagsPromise = db.select({
    uuid: tags.uuid,
    name: tags.name,
    created_by: tags.created_by,
    created_by_name: users.name,
    created_at: tags.created_at,
    updated_at: tags.updated_at,
    remarks: tags.remarks,
  })
    .from(tags)
    .leftJoin(users, eq(tags.created_by, users.uuid));

  const data = await tagsPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const tagsPromise = db.select({
    uuid: tags.uuid,
    name: tags.name,
    created_by: tags.created_by,
    created_by_name: users.name,
    created_at: tags.created_at,
    updated_at: tags.updated_at,
    remarks: tags.remarks,
  })
    .from(tags)
    .leftJoin(users, eq(tags.created_by, users.uuid))
    .where(eq(tags.uuid, uuid));

  const [data] = await tagsPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
