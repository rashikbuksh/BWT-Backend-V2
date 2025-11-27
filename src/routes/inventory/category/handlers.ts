import type { AppRouteHandler } from '@/lib/types';

import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { category } from '../schema';

const updatedByUser = alias(users, 'updated_by_user');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(category).values(value).returning({
    name: category.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(category)
    .set(updates)
    .where(eq(category.uuid, uuid))
    .returning({
      name: category.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(category)
    .where(eq(category.uuid, uuid))
    .returning({
      name: category.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const resultPromise = db.select({
    uuid: category.uuid,
    name: category.name,
    created_by: category.created_by,
    created_by_name: users.name,
    updated_by: category.updated_by,
    updated_by_name: updatedByUser.name,
    created_at: category.created_at,
    updated_at: category.updated_at,
    remarks: category.remarks,
  })
    .from(category)
    .leftJoin(users, eq(category.created_by, users.uuid))
    .leftJoin(updatedByUser, eq(category.updated_by, updatedByUser.uuid));

  const data = await resultPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const resultPromise = db.select({
    uuid: category.uuid,
    name: category.name,
    created_by: category.created_by,
    created_by_name: users.name,
    updated_by: category.updated_by,
    updated_by_name: updatedByUser.name,
    created_at: category.created_at,
    updated_at: category.updated_at,
    remarks: category.remarks,
  })
    .from(category)
    .leftJoin(users, eq(category.created_by, users.uuid))
    .leftJoin(updatedByUser, eq(category.updated_by, updatedByUser.uuid))
    .where(eq(category.uuid, uuid));

  const [data] = await resultPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
