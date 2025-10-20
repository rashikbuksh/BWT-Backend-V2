import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { group, head } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(group).values(value).returning({
    name: group.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(group)
    .set(updates)
    .where(eq(group.uuid, uuid))
    .returning({
      name: group.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(group)
    .where(eq(group.uuid, uuid))
    .returning({
      name: group.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const groupPromise = db
    .select({
      uuid: group.uuid,
      name: group.name,
      head_uuid: group.head_uuid,
      head_name: head.name,
      code: group.code,
      is_fixed: group.is_fixed,
      created_by: group.created_by,
      created_by_name: createdByUser.name,
      created_at: group.created_at,
      updated_by: group.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: group.updated_at,
      remarks: group.remarks,
      group_number: group.group_number,
      index: group.index,
    })
    .from(group)
    .leftJoin(head, eq(head.uuid, group.head_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, group.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, group.updated_by))
    .orderBy(desc(group.created_at));

  const data = await groupPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const groupPromise = db
    .select({
      uuid: group.uuid,
      name: group.name,
      head_uuid: group.head_uuid,
      head_name: head.name,
      code: group.code,
      is_fixed: group.is_fixed,
      created_by: group.created_by,
      created_by_name: createdByUser.name,
      created_at: group.created_at,
      updated_by: group.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: group.updated_at,
      remarks: group.remarks,
      group_number: group.group_number,
      index: group.index,
    })
    .from(group)
    .leftJoin(head, eq(head.uuid, group.head_uuid))
    .leftJoin(createdByUser, eq(createdByUser.uuid, group.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, group.updated_by))
    .where(eq(group.uuid, uuid));

  const [data] = await groupPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
