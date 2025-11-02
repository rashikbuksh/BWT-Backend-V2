import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { festival, users } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');
export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(festival).values(value).returning({
    name: festival.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(festival)
    .set(updates)
    .where(eq(festival.uuid, uuid))
    .returning({
      name: festival.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(festival)
    .where(eq(festival.uuid, uuid))
    .returning({
      name: festival.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const festivalPromise = db
    .select({
      uuid: festival.uuid,
      name: festival.name,
      religion: festival.religion,
      created_by: festival.created_by,
      created_by_name: createdByUser.name,
      created_at: festival.created_at,
      updated_by: festival.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: festival.updated_at,
      remarks: festival.remarks,
    })
    .from(festival)
    .leftJoin(createdByUser, eq(festival.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(festival.updated_by, updatedByUser.uuid))
    .orderBy(desc(festival.created_at));

  const data = await festivalPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const festivalPromise = db
    .select({
      uuid: festival.uuid,
      name: festival.name,
      religion: festival.religion,
      created_by: festival.created_by,
      created_by_name: createdByUser.name,
      created_at: festival.created_at,
      updated_by: festival.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: festival.updated_at,
      remarks: festival.remarks,
    })
    .from(festival)
    .leftJoin(createdByUser, eq(festival.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(festival.updated_by, updatedByUser.uuid))
    .where(eq(festival.uuid, uuid));

  const [data] = await festivalPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
