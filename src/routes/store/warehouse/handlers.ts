import type { AppRouteHandler } from '@/lib/types';

import { desc, eq } from 'drizzle-orm';
import * as HSCode from 'stoker/http-status-codes';

import db from '@/db';
import { users } from '@/routes/hr/schema';
import { createToast, DataNotFound, ObjectNotFound } from '@/utils/return';

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from './routes';

import { branch, warehouse } from '../schema';

export const create: AppRouteHandler<CreateRoute> = async (c: any) => {
  const value = c.req.valid('json');

  const [data] = await db.insert(warehouse).values(value).returning({
    name: warehouse.name,
  });

  return c.json(createToast('create', data.name), HSCode.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');
  const updates = c.req.valid('json');

  if (Object.keys(updates).length === 0)
    return ObjectNotFound(c);

  const [data] = await db.update(warehouse)
    .set(updates)
    .where(eq(warehouse.uuid, uuid))
    .returning({
      name: warehouse.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('update', data.name), HSCode.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const [data] = await db.delete(warehouse)
    .where(eq(warehouse.uuid, uuid))
    .returning({
      name: warehouse.name,
    });

  if (!data)
    return DataNotFound(c);

  return c.json(createToast('delete', data.name), HSCode.OK);
};

export const list: AppRouteHandler<ListRoute> = async (c: any) => {
  const warehousePromise = db
    .select({
      uuid: warehouse.uuid,
      name: warehouse.name,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
      created_by: warehouse.created_by,
      created_by_name: users.name,
      created_at: warehouse.created_at,
      updated_at: warehouse.created_at,
      remarks: warehouse.remarks,
      assigned: warehouse.assigned,
    })
    .from(warehouse)
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .leftJoin(users, eq(warehouse.created_by, users.uuid))
    .orderBy(desc(warehouse.created_at));

  const data = await warehousePromise;

  return c.json(data || [], HSCode.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c: any) => {
  const { uuid } = c.req.valid('param');

  const warehousePromise = db
    .select({
      uuid: warehouse.uuid,
      name: warehouse.name,
      branch_uuid: warehouse.branch_uuid,
      branch_name: branch.name,
      created_by: warehouse.created_by,
      created_by_name: users.name,
      created_at: warehouse.created_at,
      updated_at: warehouse.updated_at,
      remarks: warehouse.remarks,
      assigned: warehouse.assigned,
    })
    .from(warehouse)
    .leftJoin(branch, eq(warehouse.branch_uuid, branch.uuid))
    .leftJoin(users, eq(warehouse.created_by, users.uuid))
    .where(eq(warehouse.uuid, uuid));

  const [data] = await warehousePromise;

  if (!data)
    return DataNotFound(c);

  return c.json(data || {}, HSCode.OK);
};
