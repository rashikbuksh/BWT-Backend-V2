import type { AppRouteHandler } from '@/lib/types';

import { desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
// import { createApi } from '@/utils/api';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { forum } from '../schema';

const createdByUser = alias(users, 'created_by_user');
const updatedByUser = alias(users, 'updated_by_user');
const userHrSchema = alias(users, 'user_hr_schema');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(forum).values(value).returning({
    name: forum.uuid,
  });

  return c.json(createToast('create', data?.name ?? 'Comment created'), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(forum)
    .set(updates)
    .where(eq(forum.uuid, uuid))
    .returning({
      name: forum.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(forum)
    .where(eq(forum.uuid, uuid))
    .returning({
      name: forum.uuid,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const forumPromise = db
    .select({
      uuid: forum.uuid,
      user_uuid: forum.user_uuid,
      user_created_at: userHrSchema.created_at,
      name: sql`CASE WHEN forum.user_uuid IS NULL THEN forum.name ELSE ${userHrSchema.name} END`,
      phone: sql`CASE WHEN forum.user_uuid IS NULL THEN forum.phone ELSE ${userHrSchema.phone} END`,
      question: forum.question,
      answer: forum.answer,
      is_answered: forum.is_answered,
      created_by: forum.created_by,
      created_by_name: createdByUser.name,
      created_at: forum.created_at,
      updated_by: forum.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: forum.updated_at,
      remarks: forum.remarks,
      title: forum.title,
      tags: forum.tags,
    })
    .from(forum)
    .leftJoin(createdByUser, eq(forum.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(forum.updated_by, updatedByUser.uuid))
    .leftJoin(userHrSchema, eq(forum.user_uuid, userHrSchema.uuid))
    .orderBy(desc(forum.created_at));

  const data = await forumPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const forumPromise = db
    .select({
      uuid: forum.uuid,
      user_uuid: forum.user_uuid,
      user_created_at: userHrSchema.created_at,
      name: sql`CASE WHEN forum.user_uuid IS NULL THEN forum.name ELSE ${userHrSchema.name} END`,
      phone: sql`CASE WHEN forum.user_uuid IS NULL THEN forum.phone ELSE ${userHrSchema.phone} END`,
      question: forum.question,
      answer: forum.answer,
      is_answered: forum.is_answered,
      created_by: forum.created_by,
      created_by_name: createdByUser.name,
      created_at: forum.created_at,
      updated_by: forum.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: forum.updated_at,
      remarks: forum.remarks,
      title: forum.title,
      tags: forum.tags,
    })
    .from(forum)
    .leftJoin(createdByUser, eq(forum.created_by, createdByUser.uuid))
    .leftJoin(updatedByUser, eq(forum.updated_by, updatedByUser.uuid))
    .where(eq(forum.uuid, uuid));

  const [data] = await forumPromise;

  // if (!data)
  //   return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
