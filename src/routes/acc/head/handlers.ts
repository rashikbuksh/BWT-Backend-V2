import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { head } from '../schema';

const createdByUser = alias(users, 'createdByUser');
const updatedByUser = alias(users, 'updatedByUser');

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(head).values(value).returning({
    name: head.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(head)
    .set(updates)
    .where(eq(head.uuid, uuid))
    .returning({
      name: head.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(head)
    .where(eq(head.uuid, uuid))
    .returning({
      name: head.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const headPromise = db
    .select({
      uuid: head.uuid,
      name: head.name,
      title: head.title,
      bs: head.bs,
      is_fixed: head.is_fixed,
      type: head.type,
      group_number: head.group_number,
      created_by: head.created_by,
      created_by_name: createdByUser.name,
      created_at: head.created_at,
      updated_by: head.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: head.updated_at,
      remarks: head.remarks,
      index: head.index,
    })
    .from(head)
    .leftJoin(createdByUser, eq(createdByUser.uuid, head.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, head.updated_by))
    .orderBy(desc(head.created_at));

  const data = await headPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const headPromise = db
    .select({
      uuid: head.uuid,
      name: head.name,
      title: head.title,
      bs: head.bs,
      is_fixed: head.is_fixed,
      type: head.type,
      group_number: head.group_number,
      created_by: head.created_by,
      created_by_name: createdByUser.name,
      created_at: head.created_at,
      updated_by: head.updated_by,
      updated_by_name: updatedByUser.name,
      updated_at: head.updated_at,
      remarks: head.remarks,
      index: head.index,
    })
    .from(head)
    .leftJoin(createdByUser, eq(createdByUser.uuid, head.created_by))
    .leftJoin(updatedByUser, eq(updatedByUser.uuid, head.updated_by))
    .where(eq(head.uuid, uuid));

  const [data] = await headPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
