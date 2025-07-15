import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { designation } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(designation).values(value).returning({
    name: designation.designation,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(designation)
    .set(updates)
    .where(eq(designation.uuid, uuid))
    .returning({
      name: designation.designation,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(designation)
    .where(eq(designation.uuid, uuid))
    .returning({
      name: designation.designation,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const designationPromise = db
    .select({
      uuid: designation.uuid,
      designation: designation.designation,
      created_at: designation.created_at,
      updated_at: designation.updated_at,
      remarks: designation.remarks,
      id: designation.id,
      hierarchy: designation.hierarchy,
      status: designation.status,
    })
    .from(designation)
    .orderBy(desc(designation.created_at));

  const data = await designationPromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const designationPromise = db
    .select({
      uuid: designation.uuid,
      designation: designation.designation,
      created_at: designation.created_at,
      updated_at: designation.updated_at,
      remarks: designation.remarks,
      id: designation.id,
      hierarchy: designation.hierarchy,
      status: designation.status,
    })
    .from(designation)
    .where(eq(designation.uuid, uuid));

  const [data] = await designationPromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
